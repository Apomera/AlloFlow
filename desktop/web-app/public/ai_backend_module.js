/**
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
    const window = (typeof globalThis !== 'undefined' && globalThis.window)
        ? globalThis.window
        : (typeof globalThis !== 'undefined' ? globalThis : {});

    // ─── Duplicate-load guard ─────────────────────────────────────────
    if (window.__aiBackendModuleLoaded) return;
    window.__aiBackendModuleLoaded = true;

    // ═══════════════════════════════════════════════════════════════════
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
    };

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 2: WebSearchProvider + SECTION 3: AIProvider
    // ═══════════════════════════════════════════════════════════════════

/**
 * AlloFlow AI Provider — Backend-Agnostic AI Abstraction Layer
 * 
 * Copyright (C) 2026 Aaron Pomeranz, PsyD
 * Licensed under GNU AGPL v3 (same as AlloFlow core)
 * 
 * This module provides a unified interface for all AI operations,
 * supporting multiple backends: Gemini, LocalAI, LM Studio, Ollama, OpenAI,
 * Claude, AlloFlow Local Engine, or any OpenAI-compatible custom endpoint.
 * 
 * Usage:
 *   const ai = new AIProvider({ backend: 'gemini', apiKey, models: {...} });
 *   const text = await ai.generateText('Write a poem', { json: false });
 *   const image = await ai.generateImage('A sunset', { width: 800 });
 *   const edited = await ai.editImage('Remove text', base64, { width: 800 });
 *   const audio = await ai.textToSpeech('Hello world', { voice: 'Puck' });
 */

// ─── AI Provider Class ────────────────────────────────────────────────────────


// ─── WEB SEARCH PROVIDER (SearXNG + DuckDuckGo) ────────────────────────────
// Primary: SearXNG (self-hosted, full SERP, ~85% Google parity)
// Fallback: DuckDuckGo Instant Answers (free, no key)
// Returns Gemini-compatible groundingMetadata.
/**
 * AlloFlow Web Search Provider
 * 
 * Provides web search for non-Gemini AI backends (Ollama, LocalAI, etc.)
 * 
 * Search chain:
 *   1. SearXNG (self-hosted, full SERP, ~85% Google parity) — default at localhost:8888
 *   2. DuckDuckGo Instant Answers (free, no key) — fallback if SearXNG unavailable
 *   3. Offline graceful degradation — returns empty results
 * 
 * Returns Gemini-compatible groundingMetadata so existing citation rendering works unchanged.
 */

const WebSearchProvider = {

    // Configuration
    searxngUrl: 'http://localhost:8888',
    _searxngAvailable: null, // cached availability check
    _lastCheckTime: 0,

    // ── Canvas environment detection ──
    // In Canvas, Serper proxy is the primary search source.
    // SearXNG (localhost) and DDG are skipped in Canvas.
    get _isCanvas() {
        return typeof window !== 'undefined' && (
            window.location.hostname.includes('googleusercontent') ||
            window.location.hostname.includes('scf.usercontent') ||
            window.location.hostname.includes('idx.google') ||
            window.location.href.startsWith('blob:')
        );
    },

    // ── Serper.dev Search Proxy (via Firebase Cloud Function) ──
    // API key is stored server-side in Firebase Secret Manager.
    // The proxy is accessed via Firebase Hosting rewrite → Cloud Function.
    _serperProxyUrl: null, // resolved at runtime by _initSearchProxy()
    _serperProxyMode: null, // authenticated-post | canvas-compat-get
    _serperAvailable: true,
    _serperConsecutiveFailures: 0,
    _serperCooldownUntil: 0,
    _serperInitialized: false,

    /**
     * Initialize the search proxy URL.
     * In Canvas: uses absolute Firebase URL (same-origin won't work from Canvas iframe).
     * On an owned Firebase site: uses relative /api/searchProxy (same-origin, no CORS).
     */
    _initSearchProxy() {
        if (this._serperInitialized) return;
        this._serperInitialized = true;
        const isOwnedFirebaseHost = typeof window !== 'undefined'
            && (/\.web\.app$/.test(window.location.hostname) || /\.firebaseapp\.com$/.test(window.location.hostname));
        const explicitHost = typeof window !== 'undefined'
            ? String(window.ALLOFLOW_FUNCTIONS_HOST || window.ALLOFLOW_HOST || '').replace(/\/$/, '')
            : '';
        const canvasCompatibilityUrl = typeof window !== 'undefined'
            ? String(window.ALLOFLOW_CANVAS_SEARCH_PROXY || '').trim()
            : '';
        const canvasCompatibilityEnabled = this._isCanvas
            && typeof window !== 'undefined'
            && !window.ALLOFLOW_DISABLE_CANVAS_SEARCH_PROXY
            && /^https:\/\//i.test(canvasCompatibilityUrl);
        if (isOwnedFirebaseHost) {
            this._serperProxyUrl = '/api/searchProxy';
            this._serperProxyMode = 'authenticated-post';
            console.log('[WebSearch] Owned Firebase site - optional authenticated search proxy enabled.');
        } else if (explicitHost) {
            this._serperProxyUrl = `${explicitHost}/api/searchProxy`;
            this._serperProxyMode = 'authenticated-post';
            console.log('[WebSearch] Explicit optional search proxy configured.');
        } else if (canvasCompatibilityEnabled) {
            this._serperProxyUrl = canvasCompatibilityUrl;
            this._serperProxyMode = 'canvas-compat-get';
            console.log('[WebSearch] Canvas compatibility search transport enabled.');
        } else {
            this._serperProxyUrl = null;
            this._serperProxyMode = null;
            console.log('[WebSearch] No optional Firebase search proxy configured; using the environment search path.');
        }
    },

    /**
     * Search the web and return results with Gemini-compatible grounding metadata.
     */
    async search(query, maxResults = 10, searchQueryOverride = null) {
        if (!query || query.trim().length < 3) {
            return { results: [], contextPrompt: '', groundingMetadata: null };
        }

        // Offline check
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.log('[WebSearch] Device is offline — skipping web search');
            return { results: [], contextPrompt: '', groundingMetadata: null, offline: true };
        }

        try {
            const searchQuery = searchQueryOverride || this._extractSearchQuery(query);
            console.log(`[WebSearch] Searching for: "${searchQuery}"`);

            // Priority chain: Serper.dev proxy → SearXNG → DuckDuckGo
            let results = [];
            let source = 'none';

            // Ensure search proxy is initialized
            this._initSearchProxy();

            // Auto-reset Serper availability after cooldown period expires
            if (!this._serperAvailable && this._serperCooldownUntil && Date.now() > this._serperCooldownUntil) {
                this._serperAvailable = true;
                this._serperConsecutiveFailures = 0;
                this._serperCooldownUntil = 0;
                console.log('[WebSearch] Serper cooldown expired — re-enabling');
            }

            console.log('[WebSearch] Serper state:', {
                proxyUrl: this._serperProxyUrl,
                available: this._serperAvailable,
                consecutiveFailures: this._serperConsecutiveFailures,
                cooldownUntil: this._serperCooldownUntil ? new Date(this._serperCooldownUntil).toISOString() : 'none',
                isCanvas: this._isCanvas,
            });

            // 1️⃣ Serper.dev proxy (best results — real Google SERP via Firebase Cloud Function)
            if (this._serperProxyUrl && this._serperAvailable) {
                try {
                    results = await this._fetchSerper(searchQuery, maxResults);
                    source = 'Serper';
                } catch (err) {
                    console.log('[WebSearch] Serper proxy failed:', err.message);
                }
            }

            // In Canvas, Serper proxy is the ONLY search source.
            // SearXNG (localhost) is unreachable, and DDG Instant Answers API
            // is too inconsistent — it returns results unpredictably.
            if (!this._isCanvas) {
                // 2️⃣ SearXNG (self-hosted, full SERP) — non-Canvas only
                if (results.length === 0 && await this._isSearXNGAvailable()) {
                    try {
                        results = await this._fetchSearXNG(searchQuery, maxResults);
                        source = 'SearXNG';
                    } catch (err) {
                        console.warn('[WebSearch] SearXNG failed, trying DuckDuckGo fallback:', err.message);
                    }
                }

                // 3️⃣ DuckDuckGo (free, no key) — non-Canvas only
                if (results.length === 0) {
                    try {
                        results = await this._fetchDuckDuckGo(searchQuery, maxResults);
                        source = 'DuckDuckGo';
                    } catch (err) {
                        console.warn('[WebSearch] DuckDuckGo also failed:', err.message);
                    }
                }
            }

            if (results.length === 0) {
                console.log(`[WebSearch] No results from ${this._isCanvas ? 'Serper (Canvas mode — DDG/SearXNG skipped)' : 'any source'}`);
                return { results: [], contextPrompt: '', groundingMetadata: null };
            }

            console.log(`[WebSearch] Found ${results.length} results via ${source}`);

            const contextPrompt = this._buildContextPrompt(results);
            const groundingMetadata = this._buildGroundingMetadata(results);

            return { results, contextPrompt, groundingMetadata, source };

        } catch (err) {
            console.warn('[WebSearch] Search failed:', err.message);
            return { results: [], contextPrompt: '', groundingMetadata: null };
        }
    },

    /**
     * Check if SearXNG is available (cached for 60 seconds).
     */
    async _isSearXNGAvailable() {
        const now = Date.now();
        if (this._searxngAvailable !== null && (now - this._lastCheckTime) < 60000) {
            return this._searxngAvailable;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const resp = await fetch(`${this.searxngUrl}/search?q=test&format=json`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);
            this._searxngAvailable = resp.ok;
        } catch {
            this._searxngAvailable = false;
        }
        this._lastCheckTime = now;
        console.log(`[WebSearch] SearXNG available: ${this._searxngAvailable}`);
        return this._searxngAvailable;
    },

    /**
     * Extract a focused search query from a long prompt.
     * Matches the Topic/Query field patterns used in callGemini callers.
     * Logs extraction method to aid debugging.
     */
    _extractSearchQuery(prompt) {
        if (prompt.length <= 100) return prompt;

        // Priority 1: Explicit Topic/Query fields (matches all callGemini callers)
        const topicPatterns = [
            [/Topic:\s*"([^"]{2,120})"/i,                'Topic:"..."'],
            [/Topic:\s*'([^']{2,120})'/i,                "Topic:'...'"],
            [/User Query\/Skill:\s*"([^"]{2,120})"/i,    'UserQuery/Skill'],
            [/Learning Goal:\s*"([^"]{2,120})"/i,        'LearningGoal'],
            [/Verify\s+(?:the\s+)?(?:factual\s+)?accuracy.*?Text\s+Segment:\s*"([^"]{3,120})/is, 'Verify-text-segment'],
            [/article\s+about\s+"([^"]{2,120})"/i,       'article about'],
            [/Verify\s+(?:the\s+)?(?:factual\s+)?accuracy.*?Text\s+Segment:\s*"([^"]{3,120})/is, 'Verify-text-segment'],
            [/article\s+about\s+"([^"]{2,120})"/i,       'article about'],
            [/resources?\s+about:?\s+(.{3,100}?)(?:\.\s|\.\s*$|$)/im, 'resources about'],
            [/(?:text|content)\s+about\s*:?\s*"([^"]{2,120})"/i, 'content about'],
            [/Analyze\s+.*?about\s+"([^"]{2,120})"/i,    'Analyze about'],
            [/standard[:\s]+"([^"]{2,120})"/i,            'Standard'],
            [/Academic Standard:\s*"([^"]{2,120})"/i,     'AcademicStandard'],
        ];

        for (const [pattern, label] of topicPatterns) {
            const match = prompt.match(pattern);
            if (match && match[1] && match[1].trim().length >= 2) {
                const extracted = match[1].trim();
                // Reject if the extracted text looks like more template boilerplate
                if (/^(the following|this|these|a |an )\b/i.test(extracted)) continue;
                console.log(`[WebSearch] Query extracted via ${label}: "${extracted}"`);
                return extracted;
            }
        }

        // Priority 2: Generic "about/regarding" with quoted or unquoted content
        const genericPatterns = [
            [/(?:about|regarding)\s+[""\u201C]([^""\u201D]{3,80})[""\u201D]/i, 'about "..."'],
            [/(?:about|regarding)\s+([^.,\n"]{3,60}?)(?:\.|,|\n|$)/im, 'about ...'],
        ];

        for (const [pattern, label] of genericPatterns) {
            const match = prompt.match(pattern);
            if (match && match[1]) {
                const extracted = match[1].trim();
                // Reject boilerplate-looking matches
                if (/^(the following|this|these|a |an )\b/i.test(extracted)) continue;
                if (extracted.length < 3) continue;
                console.log(`[WebSearch] Query extracted via ${label}: "${extracted}"`);
                return extracted;
            }
        }

        // Priority 3: First short quoted string in the prompt (authors often quote the actual topic)
        const quotedMatch = prompt.match(/"([^"]{3,80})"/);
        if (quotedMatch && quotedMatch[1]) {
            const q = quotedMatch[1].trim();
            // Reject if it looks like a JSON key, instruction, or template placeholder
            if (!/^(code|description|framework|name|role|text|task|format|return|here|source|the |a )(?:\b|$)/i.test(q) && q.length >= 3) {
                console.log(`[WebSearch] Query extracted via first-quoted: "${q}"`);
                return q;
            }
        }

        // Priority 4: First meaningful sentence (skip template/instruction boilerplate)
        const skipLine = /^(research|write|generate|task|you are|instructions?|system|note|critical|important|verification|synthesis|strict|do not|return only|use google|find\s+official|find\s+high|identify|extract|cross-reference|verify|base your|also use|focus on|ensure|the following|include|keep|webb|target|return|use |if |for |---|format|output|rules?|text segment|\*|✓|✗|#|\d+[.)]\s)/i;
        const sentences = prompt.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 120);
        for (const s of sentences) {
            if (!skipLine.test(s)) {
                console.log(`[WebSearch] Query extracted via first-sentence: "${s.slice(0, 100)}"`);
                return s.slice(0, 100);
            }
        }

        // Final fallback: shortest non-trivial sentence (avoids long template lines)
        const byLength = sentences.slice().sort((a, b) => a.length - b.length);
        const shortest = byLength.find(s => s.length > 10 && s.length < 100 && !skipLine.test(s));
        if (shortest) {
            console.log(`[WebSearch] Query extracted via shortest-sentence: "${shortest}"`);
            return shortest;
        }
        console.warn('[WebSearch] Query extraction: all methods failed, using truncated prompt');
        return sentences[0]?.slice(0, 100) || prompt.slice(0, 80);
    },

    // ─── SearXNG (Primary) ──────────────────────────────────────────────

    /**
     * Fetch search results from SearXNG (self-hosted metasearch engine).
     * Returns full SERP results — titles, URLs, snippets, engines used.
     */
    async _fetchSearXNG(query, maxResults) {
        const url = `${this.searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`SearXNG returned ${response.status}`);
        }

        const data = await response.json();
        const results = [];

        if (data.results && Array.isArray(data.results)) {
            for (const r of data.results) {
                if (results.length >= maxResults) break;
                if (r.url && (r.title || r.content)) {
                    results.push({
                        title: r.title || query,
                        url: r.url,
                        snippet: r.content || r.title || '',
                        source: r.engine || 'SearXNG',
                        engines: r.engines || [],
                    });
                }
            }
        }

        return results;
    },

    // ─── DuckDuckGo (Fallback) ──────────────────────────────────────────

    /**
     * Fetch search results from DuckDuckGo Instant Answers API.
     * Free, no API key required. Returns topic summaries.
     */
    async _fetchDuckDuckGo(query, maxResults) {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`DuckDuckGo API returned ${response.status}`);
        }

        const data = await response.json();
        const results = [];

        if (data.Abstract && data.AbstractURL) {
            results.push({
                title: data.Heading || query,
                url: data.AbstractURL,
                snippet: data.Abstract,
                source: data.AbstractSource || 'DuckDuckGo',
            });
        }

        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
            for (const topic of data.RelatedTopics) {
                if (results.length >= maxResults) break;
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
                        url: topic.FirstURL,
                        snippet: topic.Text,
                        source: 'DuckDuckGo',
                    });
                }
                if (topic.Topics && Array.isArray(topic.Topics)) {
                    for (const sub of topic.Topics) {
                        if (results.length >= maxResults) break;
                        if (sub.Text && sub.FirstURL) {
                            results.push({
                                title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 60),
                                url: sub.FirstURL,
                                snippet: sub.Text,
                                source: 'DuckDuckGo',
                            });
                        }
                    }
                }
            }
        }

        if (data.Results && Array.isArray(data.Results)) {
            for (const r of data.Results) {
                if (results.length >= maxResults) break;
                if (r.Text && r.FirstURL) {
                    results.push({
                        title: r.Text.split(' - ')[0] || r.Text.slice(0, 60),
                        url: r.FirstURL,
                        snippet: r.Text,
                        source: 'DuckDuckGo',
                    });
                }
            }
        }

        if (data.Answer && results.length === 0) {
            results.push({
                title: query,
                url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                snippet: data.Answer,
                source: 'DuckDuckGo',
            });
        }

        return results;
    },

    // ─── Serper.dev Proxy (Priority) ──────────────────────────────────────

    /**
     * Fetch search results via the Serper.dev proxy (Firebase Cloud Function).
     * API key is stored server-side in Firebase Secret Manager.
     * Returns real Google SERP results.
     */
    async _fetchSerper(query, maxResults) {
        const url = this._serperProxyUrl;
        const isCanvasCompatibility = this._isCanvas
            && this._serperProxyMode === 'canvas-compat-get';
        const safeQuery = String(query || '')
            .replace(/[\u0000-\u001F\u007F]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200);
        const safeResultCount = Math.max(1, Math.min(Number(maxResults) || 5, 10));
        if (!url || safeQuery.length < 2) {
            throw new Error('Search proxy or query is not configured.');
        }
        const getSecurityHeaders = typeof window !== 'undefined'
            && window.__alloFirebase
            && window.__alloFirebase.getFunctionSecurityHeaders;
        if (!isCanvasCompatibility && typeof getSecurityHeaders !== 'function') {
            throw new Error('Authenticated Firebase search is not configured.');
        }
        const securityHeaders = isCanvasCompatibility ? {} : await getSecurityHeaders();
        const requestUrl = isCanvasCompatibility
            ? `${url}?q=${encodeURIComponent(safeQuery)}&num=${safeResultCount}`
            : url;

        let response;
        try {
            console.log(`[WebSearch] Calling ${isCanvasCompatibility ? 'Canvas compatibility' : 'authenticated'} Serper proxy.`);
            response = await fetch(requestUrl, {
                method: isCanvasCompatibility ? 'GET' : 'POST',
                mode: 'cors',
                headers: isCanvasCompatibility
                    ? { Accept: 'application/json' }
                    : { 'Content-Type': 'application/json', ...securityHeaders },
                ...(isCanvasCompatibility ? { referrerPolicy: 'no-referrer' } : {
                    body: JSON.stringify({ query: safeQuery, num: safeResultCount }),
                }),
                signal: AbortSignal.timeout ? AbortSignal.timeout((window.AlloFlowConfig && window.AlloFlowConfig.timeouts && window.AlloFlowConfig.timeouts.webSearchMs) || 15000) : undefined,
            });
        } catch (fetchErr) {
            // Network/CORS/timeout error
            console.log(`[WebSearch] ❌ Serper NETWORK ERROR:`, fetchErr.message);
            if (typeof window !== 'undefined') {
                console.log(`[WebSearch] Serper proxy URL: ${url}`);
                console.log(`[WebSearch] Page origin: ${window.location.origin}`);
            }
            this._serperConsecutiveFailures++;
            if (this._serperConsecutiveFailures >= 3) {
                this._serperAvailable = false;
                this._serperCooldownUntil = Date.now() + 120000; // 2 min cooldown
                this._serperConsecutiveFailures = 0;
                console.log('[WebSearch] ❌ Serper failed 3x — cooldown 120s');
            } else {
                console.log(`[WebSearch] ⚠️ Serper error (${this._serperConsecutiveFailures}/3) — will retry next search`);
            }
            throw fetchErr;
        }

        if (!response.ok) {
            const status = response.status;
            let errBody = '';
            try { errBody = await response.text(); } catch {}
            console.log(`[WebSearch] ❌ Serper proxy HTTP ${status}:`, errBody.slice(0, 500));

            this._serperConsecutiveFailures++;
            if (this._serperConsecutiveFailures >= 3) {
                this._serperAvailable = false;
                this._serperCooldownUntil = Date.now() + 120000;
                this._serperConsecutiveFailures = 0;
                console.log(`[WebSearch] ❌ Serper failed 3x (HTTP ${status}) — cooldown 120s`);
            } else {
                console.log(`[WebSearch] ⚠️ Serper failed (${this._serperConsecutiveFailures}/3) — will retry next search`);
            }
            throw new Error(`Serper proxy error: ${status}`);
        }

        // Success — reset failure counter
        this._serperConsecutiveFailures = 0;
        const data = await response.json();

        // Log credits for monitoring
        if (data.credits != null) {
            console.log(`[WebSearch] Serper credits remaining: ${data.credits}`);
        }
        if (data.knowledgeGraph) {
            console.log(`[WebSearch] Serper knowledge graph: "${data.knowledgeGraph.title}"`);
        }

        // Results are already normalized by the Cloud Function
        return (Array.isArray(data.results) ? data.results : [])
            .slice(0, safeResultCount)
            .map((item) => ({
                url: String(item && item.url || '').trim(),
                title: String(item && item.title || 'Web source').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 300),
                snippet: String(item && item.snippet || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 1000),
                source: String(item && item.source || 'Search').trim().slice(0, 80),
            }))
            .filter((item) => {
                try {
                    const parsed = new URL(item.url);
                    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
                } catch (_) { return false; }
            });
    },

    // ─── Grounding Metadata Builder ─────────────────────────────────────

    /**
     * Build context prompt to inject search results into the LLM prompt.
     */
    _buildContextPrompt(results) {
        if (!results.length) return '';

        const sources = results.map((r, i) =>
            `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`
        ).join('\n\n');

        return `The following web search results provide context for your response. Use them to provide accurate, well-sourced information. Reference specific sources when possible using [Source N] notation.\n\n--- WEB SEARCH RESULTS ---\n${sources}\n--- END SEARCH RESULTS ---\n\n`;
    },

    /**
     * Build Gemini-compatible groundingMetadata from search results.
     */
    _buildGroundingMetadata(results) {
        if (!results.length) return null;

        const groundingChunks = results.map(r => ({
            web: {
                uri: r.url,
                title: r.title,
            },
        }));

        // NOTE: groundingSupports intentionally omitted for Serper results.
        // Serper has no byte-level text offsets, so processGrounding's
        // paragraph-distribution fallback (the !hasSupports branch)
        // produces much better inline citation placement.

        return {
            groundingChunks,
            searchEntryPoint: {
                renderedContent: `<a href="${this.searxngUrl || 'https://duckduckgo.com'}/?q=${encodeURIComponent(results[0]?.title || '')}" target="_blank">Search results</a>`,
            },
        };
    },

    /**
     * Check if web search is available (for UI — gray out if offline).
     */
    isAvailable() {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
        return true;
    },

    /**
     * Test connectivity to search backends.
     */
    async testConnection() {
        const searxng = await this._isSearXNGAvailable();
        let ddg = false;
        try {
            const { results } = await this._fetchDuckDuckGo('test', 1);
            ddg = results.length > 0;
        } catch { /* ignore */ }

        return {
            online: typeof navigator !== 'undefined' ? navigator.onLine : true,
            searxng,
            duckduckgo: ddg,
        };
    },

    /**
     * Diagnostic: test CSE connectivity from browser console.
     * Usage: WebSearchProvider.testCSE()
     */
    async testCSE() {
        console.log('=== CSE DIAGNOSTIC START ===');
        console.log('Page origin:', window.location.origin);
        console.log('Page hostname:', window.location.hostname);

        // 1. Load keys
        await this._loadCSEKeys();
        console.log('CSE keys loaded:', this._cseKeys.length);
        if (this._cseKeys.length === 0) {
            console.log('❌ NO CSE KEYS — cannot test. Check cse-config.json');
            return { error: 'no_keys' };
        }
        console.log('CSE engine ID:', this._cseEngineId);
        console.log('Key prefix:', this._cseKeys[0].slice(0, 10) + '...');

        // 2. Test googleapis.com reachability (simple HEAD)
        console.log('\n--- Test 1: googleapis.com reachability ---');
        try {
            const headResp = await fetch('https://www.googleapis.com/customsearch/v1?key=INVALID', { mode: 'cors' });
            console.log('✅ googleapis.com reachable. Status:', headResp.status);
        } catch (e) {
            console.log('❌ googleapis.com UNREACHABLE:', e.message);
            console.log('This confirms CORS/CSP is blocking CSE requests in this environment.');
            return { error: 'cors_blocked', message: e.message };
        }

        // 3. Test actual CSE query
        console.log('\n--- Test 2: Actual CSE API call ---');
        const key = this._cseKeys[0];
        const testUrl = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${this._cseEngineId}&q=test&num=1`;
        try {
            const resp = await fetch(testUrl, { mode: 'cors' });
            const body = await resp.text();
            console.log('HTTP Status:', resp.status);
            console.log('Response body (first 500 chars):', body.slice(0, 500));
            if (resp.ok) {
                const data = JSON.parse(body);
                console.log('✅ CSE WORKING! Items returned:', data.items?.length || 0);
                return { status: 'ok', items: data.items?.length || 0 };
            } else if (resp.status === 429) {
                console.log('⚠️ QUOTA EXHAUSTED (429) — daily limit reached for this key');
                return { error: 'quota_429', body: body.slice(0, 300) };
            } else if (resp.status === 403) {
                console.log('⚠️ FORBIDDEN (403) — key may have IP/referer restrictions or API not enabled');
                try {
                    const errData = JSON.parse(body);
                    const reason = errData?.error?.errors?.[0]?.reason || 'unknown';
                    const msg = errData?.error?.message || '';
                    console.log('Reason:', reason);
                    console.log('Message:', msg);
                    return { error: 'forbidden_403', reason, message: msg };
                } catch { return { error: 'forbidden_403', body: body.slice(0, 300) }; }
            } else {
                console.log('❌ UNEXPECTED STATUS:', resp.status);
                return { error: `http_${resp.status}`, body: body.slice(0, 300) };
            }
        } catch (e) {
            console.log('❌ FETCH FAILED:', e.message);
            return { error: 'fetch_failed', message: e.message };
        }
    },
};

// Export for use in AIProvider
if (typeof window !== 'undefined') {
    window.WebSearchProvider = WebSearchProvider;
}

// ─── END WEB SEARCH PROVIDER ───────────────────────────────────────────────

// ─── Local-backend allowlist (Phase 0) ─────────────────────────────────────
// Canonical predicate for GENUINE local text backends — the ONLY backends
// eligible for the additive streaming/chunking enhancements below. It
// deliberately EXCLUDES the two cloud OpenAI-compatible providers that also
// route through _openaiGenerateText:
//     'openai' → https://api.openai.com     'claude' → https://api.anthropic.com
// Every output-shape-changing local enhancement must gate on THIS, never on
// `backend !== 'gemini'` (which is true for those cloud providers too).
const LOCAL_BACKENDS = ['ollama', 'localai', 'lmstudio', 'alloflow-local', 'custom'];
function isLocalTextBackend(backend) {
    return LOCAL_BACKENDS.indexOf(backend) !== -1;
}
const LOCAL_CONTEXT_FALLBACK = 4096;
const LOCAL_CONTEXT_MIN = 2048;
const LOCAL_CONTEXT_MAX = 131072;
const LOCAL_MODEL_PROFILE_RULES = [
    { id: 'alloflow-qwen2.5-3b', match: /qwen2?\.?5.*3b|qwen.*3b/i, contextWindow: 4096, outputTokenLimit: 1400, jsonOutputTokenLimit: 1100 },
    { id: 'gemma-local', match: /gemma/i, contextWindow: 8192, outputTokenLimit: 1800, jsonOutputTokenLimit: 1400 },
    { id: 'llama-local', match: /llama|mistral|mixtral/i, contextWindow: 8192, outputTokenLimit: 1800, jsonOutputTokenLimit: 1400 },
    { id: 'qwen-local', match: /qwen/i, contextWindow: 8192, outputTokenLimit: 1800, jsonOutputTokenLimit: 1400 },
];
function clampLocalNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
}
function normalizeLocalModelId(value) {
    return String(value || '').split(/[\\/]/).pop().replace(/\.gguf(\?.*)?$/i, '').trim();
}
function inferLocalContextWindow(modelId) {
    const text = normalizeLocalModelId(modelId).toLowerCase();
    const explicit = text.match(/(?:ctx|context|window)[-_ ]?(\d{1,3})k\b/i) || text.match(/\b(\d{1,3})k[-_ ]?(?:ctx|context|window)\b/i);
    if (explicit) return clampLocalNumber(Number(explicit[1]) * 1024, LOCAL_CONTEXT_MIN, LOCAL_CONTEXT_MAX, LOCAL_CONTEXT_FALLBACK);
    const plain = text.match(/\b(16|32|64|128)k\b/i);
    if (plain) return clampLocalNumber(Number(plain[1]) * 1024, LOCAL_CONTEXT_MIN, LOCAL_CONTEXT_MAX, LOCAL_CONTEXT_FALLBACK);
    return null;
}
function normalizeLocalTaskState(value) {
    const state = String(value || '').toLowerCase();
    return ['pass', 'fail', 'partial', 'unknown', 'unavailable'].includes(state) ? state : 'unknown';
}
function localProbeTestState(probe, id) {
    if (!probe || !Array.isArray(probe.tests) || probe.tests.length === 0) return 'unknown';
    const test = probe.tests.find((item) => item && item.id === id);
    if (!test) return 'unknown';
    return test.ok ? 'pass' : 'fail';
}
function buildLocalTaskSupportFromProbe(probe = {}) {
    const tests = Array.isArray(probe.tests) ? probe.tests : [];
    const passed = tests.filter((test) => test && test.ok).length;
    return {
        status: normalizeLocalTaskState(probe.status === 'not-running' ? 'unavailable' : probe.status),
        generatedAt: probe.generatedAt || '',
        passed,
        total: tests.length,
        simpleText: localProbeTestState(probe, 'plain-text'),
        strictJson: localProbeTestState(probe, 'strict-json'),
        remediationJson: localProbeTestState(probe, 'remediation-shape'),
    };
}
function normalizeLocalTaskSupport(value = {}) {
    const probeSupport = value.probe ? buildLocalTaskSupportFromProbe(value.probe) : {};
    const support = value.taskSupport || value.support || value || {};
    return {
        status: normalizeLocalTaskState(support.status || probeSupport.status),
        generatedAt: support.generatedAt || probeSupport.generatedAt || '',
        passed: clampLocalNumber(support.passed, 0, 99, probeSupport.passed || 0),
        total: clampLocalNumber(support.total, 0, 99, probeSupport.total || 0),
        simpleText: normalizeLocalTaskState(support.simpleText || support.plainText || probeSupport.simpleText),
        strictJson: normalizeLocalTaskState(support.strictJson || support.json || probeSupport.strictJson),
        remediationJson: normalizeLocalTaskState(support.remediationJson || support.remediation || probeSupport.remediationJson),
    };
}
function localModelSupportsTask(profile = {}, task = 'simple-text') {
    const support = normalizeLocalTaskSupport(profile.taskSupport || {});
    const normalizedTask = String(task || 'simple-text').toLowerCase();
    if (normalizedTask === 'remediation' || normalizedTask === 'remediation-json') return support.remediationJson === 'pass';
    if (normalizedTask === 'json' || normalizedTask === 'strict-json') return support.strictJson === 'pass';
    return support.simpleText === 'pass';
}
function buildLocalModelProfile(config = {}) {
    const backend = config.backend || 'local';
    const supplied = config.localModelProfile || config.localModel || config.capabilities || {};
    const modelId = normalizeLocalModelId(supplied.modelId || supplied.model || config.modelId || (config.models && config.models.default) || backend);
    const rule = LOCAL_MODEL_PROFILE_RULES.find((item) => item.match.test(modelId)) || null;
    const inferredContext = inferLocalContextWindow(modelId);
    const contextWindow = clampLocalNumber(
        supplied.contextWindow || supplied.contextSize || supplied.n_ctx || inferredContext || (rule && rule.contextWindow),
        LOCAL_CONTEXT_MIN,
        LOCAL_CONTEXT_MAX,
        LOCAL_CONTEXT_FALLBACK
    );
    const outputTokenLimit = clampLocalNumber(
        supplied.outputTokenLimit || supplied.safeOutputTokens || (rule && rule.outputTokenLimit) || Math.floor(contextWindow * 0.28),
        256,
        Math.min(8192, contextWindow),
        Math.min(1600, Math.max(768, Math.floor(contextWindow * 0.28)))
    );
    const jsonOutputTokenLimit = clampLocalNumber(
        supplied.jsonOutputTokenLimit || supplied.safeJsonOutputTokens || (rule && rule.jsonOutputTokenLimit) || Math.floor(outputTokenLimit * 0.8),
        256,
        outputTokenLimit,
        Math.min(outputTokenLimit, 1200)
    );
    return {
        id: supplied.id || (rule && rule.id) || 'local-default',
        backend,
        modelId,
        contextWindow,
        contextSource: supplied.contextSource || (supplied.contextWindow || supplied.contextSize || supplied.n_ctx ? 'configured' : (inferredContext ? 'model-name' : (rule ? 'profile' : 'fallback'))),
        inputTokenBudget: clampLocalNumber(
            supplied.inputTokenBudget || supplied.safeInputTokens || Math.floor(contextWindow * 0.55),
            512,
            Math.max(512, contextWindow - 512),
            Math.max(1024, Math.floor(contextWindow * 0.55))
        ),
        outputTokenLimit,
        jsonOutputTokenLimit,
        reserveTokens: clampLocalNumber(supplied.reserveTokens, 128, 2048, 384),
        taskSupport: normalizeLocalTaskSupport({
            taskSupport: supplied.taskSupport,
            probe: supplied.lastProbe || supplied.probe,
        }),
    };
}
function tuneLocalTextOptions(prompt, opts = {}, profile = buildLocalModelProfile()) {
    const requested = clampLocalNumber(opts.maxTokens, 1, 65536, 8192);
    const approxPromptTokens = Math.max(1, Math.ceil(String(prompt || '').length / 4));
    const profileLimit = opts.json ? profile.jsonOutputTokenLimit : profile.outputTokenLimit;
    const roomForOutput = profile.contextWindow - approxPromptTokens - profile.reserveTokens;
    const roomLimit = roomForOutput > 0 ? roomForOutput : Math.max(128, Math.floor(profileLimit / 2));
    const maxTokens = clampLocalNumber(
        Math.min(requested, profileLimit, roomLimit),
        128,
        Math.max(128, profile.contextWindow),
        Math.min(requested, profileLimit)
    );
    return {
        maxTokens,
        promptTokens: approxPromptTokens,
        requestedMaxTokens: requested,
        contextWindow: profile.contextWindow,
        clamped: maxTokens !== requested,
        promptLikelyTooLarge: approxPromptTokens + profile.reserveTokens >= profile.contextWindow,
    };
}
// Terminal-marker sentinel for OpenAI SSE ("data: [DONE]"); a Symbol can never
// collide with real streamed content.
const STREAM_DONE = (typeof Symbol === 'function') ? Symbol('alloflow.stream.done') : ' __ALLO_STREAM_DONE__';
if (typeof window !== 'undefined') {
    window.AIBackendLocal = {
        LOCAL_BACKENDS: LOCAL_BACKENDS.slice(),
        isLocalTextBackend,
        buildLocalModelProfile,
        tuneLocalTextOptions,
        buildLocalTaskSupportFromProbe,
        localModelSupportsTask,
    };
}

class AIProvider {

    /**
     * @param {Object} config
     * @param {string} config.backend - 'gemini' | 'openai' | 'localai' | 'lmstudio' | 'ollama' | 'claude' | 'alloflow-local' | 'custom'
     * @param {string} [config.apiKey] - API key (empty string for Canvas mode)
     * @param {string} [config.baseUrl] - Base URL for the API (required for local/custom backends)
     * @param {Object} [config.models] - Model name overrides
     * @param {boolean} [config.isCanvasEnv] - Whether running in Gemini Canvas
     * @param {Function} [config.fetchWithRetry] - Retry wrapper function (fetchWithExponentialBackoff)
     * @param {Function} [config.optimizeImage] - Image optimization function
     * @param {Function} [config.debugLog] - Debug logging function
     * @param {Function} [config.warnLog] - Warning logging function
     */
    constructor(config = {}) {
        this.backend = config.backend || 'gemini';
        this._ttsProvider = (config.ttsProvider && config.ttsProvider !== 'auto') ? config.ttsProvider : null;
        this._imageProvider = (config.imageProvider && config.imageProvider !== 'auto') ? config.imageProvider : null;
        this.apiKey = config.apiKey ?? '';
        this.baseUrl = config.baseUrl || this._defaultBaseUrl();
        this.isCanvasEnv = config.isCanvasEnv || false;
        const providerTextDefault = this.backend === 'openai'
            ? 'gpt-4o-mini'
            : (this.backend === 'claude' ? 'claude-sonnet-4-20250514' : 'gemini-3-flash-preview');
        this.models = {
            default: config.models?.default || providerTextDefault,
            fallback: config.models?.fallback || providerTextDefault,
            flash: config.models?.flash || config.models?.default || providerTextDefault,
            image: config.models?.image || 'gemini-2.5-flash-image',
            imagen: config.models?.imagen || 'imagen-4.0-generate-001',
            tts: config.models?.tts || 'gemini-3-flash-preview',
            safety: config.models?.safety || 'gemini-2.5-flash-lite',
            vision: config.models?.vision || config.models?.default || 'gemini-3-flash-preview',
        };

        // Helper functions injected from the app context
        this._fetchWithRetry = config.fetchWithRetry || (async (url, opts) => {
            const resp = await fetch(url, opts);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            return resp;
        });
        this._optimizeImage = config.optimizeImage || ((url) => url);
        this._debugLog = config.debugLog || ((...args) => { });
        this._warnLog = config.warnLog || console.warn.bind(console);

        // TTS rate limiting state
        this._ttsRateLimitedUntil = 0;
        this._ttsCache = new Map();
        this._ttsQueue = Promise.resolve();

        // Imagen rate limiting state
        this._imagenRateLimited = false;
        this._imagenQueue = Promise.resolve();

        // ─── Smart model defaults for local backends ────────────────────
        if (this.backend === 'ollama' && !config.models?.vision) {
            this.models.vision = 'moondream';
        }
        if ((this.backend === 'ollama' || this.backend === 'localai' || this.backend === 'lmstudio') && !config.models?.tts) {
            this.models.tts = 'kokoro';
        }
        this.localModelProfile = buildLocalModelProfile({
            backend: this.backend,
            models: this.models,
            modelId: config.modelId,
            localModel: config.localModel,
            localModelProfile: config.localModelProfile,
            capabilities: config.capabilities,
        });
        this._localRuntimeProfileAt = 0;

        this._debugLog(`[AIProvider] Initialized: backend=${this.backend}, isCanvas=${this.isCanvasEnv}`);
    }

    _defaultBaseUrl() {
        switch (this.backend) {
            case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta';
            case 'localai': return 'http://localhost:8080';
            case 'lmstudio': return 'http://localhost:1234';
            case 'ollama': return 'http://localhost:11434';
            case 'openai': return 'https://api.openai.com';
            case 'claude': return 'https://api.anthropic.com';
            case 'alloflow-local': return 'http://localhost:32173';
            case 'custom': return 'http://localhost:8080';
            default: return 'https://generativelanguage.googleapis.com/v1beta';
        }
    }

    // response_format for OpenAI-compatible jsonMode calls. LM Studio's server
    // rejects { type: 'json_object' } outright ("'response_format.type' must
    // be 'json_schema' or 'text'" — every jsonMode call 400'd, field report
    // 2026-07-16), and its json_schema variant needs a full schema this
    // generic layer doesn't have. So for LM Studio send NO response_format
    // and lean on the prompt's JSON instruction (see _jsonPromptSuffix).
    _openaiJsonFormat() {
        if (this.backend === 'lmstudio') return {};
        return { response_format: { type: 'json_object' } };
    }

    // Belt-and-braces for backends where we can't enforce JSON server-side.
    _jsonPromptSuffix() {
        if (this.backend === 'lmstudio') {
            return '\n\nRespond with ONLY the valid JSON described above — no prose before or after it, no markdown code fences.';
        }
        return '';
    }

    // ─── TEXT GENERATION ──────────────────────────────────────────────

    async _refreshAlloFlowLocalProfileFromRuntime() {
        if (this.backend !== 'alloflow-local') return this.localModelProfile;
        if (typeof fetch !== 'function') return this.localModelProfile;
        const now = Date.now();
        if (this._localRuntimeProfileAt && now - this._localRuntimeProfileAt < 30000) {
            return this.localModelProfile;
        }
        this._localRuntimeProfileAt = now;
        try {
            const response = await fetch('/api/engine/status', { headers: { Accept: 'application/json' }, cache: 'no-store' });
            if (!response || !response.ok) return this.localModelProfile;
            const status = await response.json();
            const cap = status.capability || {};
            const modelId = (status.model && (status.model.name || status.model.url)) || (status.engine && status.engine.modelUrl) || this.models.default;
            this.localModelProfile = buildLocalModelProfile({
                backend: this.backend,
                models: this.models,
                modelId,
                localModelProfile: {
                    id: cap.profileId || cap.id,
                    modelId,
                    contextWindow: cap.contextSize || cap.contextWindow,
                    contextSource: cap.contextSource,
                    safeInputTokens: cap.safeInputTokens,
                    safeOutputTokens: cap.safeOutputTokens,
                    safeJsonOutputTokens: cap.safeJsonOutputTokens,
                    taskSupport: status.taskSupport || (status.lastProbe && status.lastProbe.taskSupport),
                    lastProbe: status.lastProbe,
                },
            });
        } catch (err) {
            this._debugLog('[AIProvider] local engine capability probe skipped:', err && err.message ? err.message : err);
        }
        return this.localModelProfile;
    }

    /**
     * Generate text from a prompt.
     * Replaces: callGemini(prompt, jsonMode, useSearch, temperature)
     * 
     * @param {string} prompt
     * @param {Object} [opts]
     * @param {boolean} [opts.json=false] - Request JSON output
     * @param {boolean} [opts.search=false] - Enable Google Search grounding (Gemini only)
     * @param {number} [opts.temperature] - Sampling temperature
     * @param {number} [opts.maxTokens=8192] - Max output tokens
     * @returns {Promise<string|Object>} Generated text (or {text, groundingMetadata} if search=true)
     */
    async generateText(prompt, { json = false, search = false, temperature = null, maxTokens = 8192, onProgress = null, signal = null } = {}) {
        if (signal && signal.aborted) {
            const error = new Error('Text generation cancelled.');
            error.name = 'AbortError';
            throw error;
        }
        if (!prompt) return json ? '{}' : '';
        this._debugLog(`[AIProvider] generateText: backend=${this.backend}, json=${json}, search=${search}`);
        let effectiveMaxTokens = maxTokens;
        let localUsage = null;
        if (isLocalTextBackend(this.backend)) {
            await this._refreshAlloFlowLocalProfileFromRuntime();
            localUsage = tuneLocalTextOptions(prompt, { json, maxTokens }, this.localModelProfile);
            effectiveMaxTokens = localUsage.maxTokens;
            if (temperature === null && json) temperature = 0;
            if (localUsage.clamped) {
                this._debugLog(`[AIProvider] local maxTokens clamped ${localUsage.requestedMaxTokens} -> ${effectiveMaxTokens} (ctx=${localUsage.contextWindow}, prompt~${localUsage.promptTokens})`);
            }
            if (localUsage.promptLikelyTooLarge) {
                this._warnLog('[AIProvider] local prompt is near/over the model context window; a resource-level chunked path is recommended.');
            }
        }

        switch (this.backend) {
            case 'gemini':
                return this._geminiGenerateText(prompt, { json, search, temperature, maxTokens: effectiveMaxTokens, signal });
            case 'claude':
                return this._claudeGenerateText(prompt, { json, search, temperature, maxTokens: effectiveMaxTokens, signal });
            case 'openai':
            case 'localai':
            case 'lmstudio':
            case 'ollama':
            case 'alloflow-local':
            case 'custom':
            default:
                return this._openaiGenerateText(prompt, { json, search, temperature, maxTokens: effectiveMaxTokens, onProgress, localProfile: this.localModelProfile, localUsage, signal });
        }
    }

    async _geminiGenerateText(prompt, { json, search, temperature, maxTokens, signal }) {
        const buildUrl = (model) => {
            this._debugLog(`[AIProvider] ✉ Using model: ${model}`);
            const keyParam = this.apiKey ? `?key=${this.apiKey}` : '';
            return `${this.baseUrl}/models/${model}:generateContent${keyParam}`;
        };

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                ...(json ? { responseMimeType: 'application/json' } : {}),
                ...(temperature !== null ? { temperature } : {}),
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            ],
        };

        if (search) {
            payload.tools = [{ google_search: {} }];
        }

        const fetchOpts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal,
        };

        let response;
        try {
            response = await this._fetchWithRetry(buildUrl(this.models.default), fetchOpts);
        } catch (primaryErr) {
            if (primaryErr && primaryErr.name === 'AbortError') throw primaryErr;
            const is429 = primaryErr.message && (
                primaryErr.message.includes('429') ||
                primaryErr.message.includes('RESOURCE_EXHAUSTED') ||
                primaryErr.message.includes('Failed to fetch') ||
                primaryErr.message.includes('403')
            );
            if (is429 && this.models.fallback && this.models.fallback !== this.models.default) {
                this._warnLog(`[AIProvider] Primary model error — falling back to ${this.models.fallback}`);
                try {
                    response = await this._fetchWithRetry(buildUrl(this.models.fallback), fetchOpts);
                } catch (fbErr) {
                    console.error('[AIProvider] Fallback also failed:', fbErr.message);
                    throw fbErr;
                }
            } else {
                throw primaryErr;
            }
        }

        const data = await response.json();

        if (data.promptFeedback?.blockReason) {
            this._warnLog('[AIProvider] Prompt Blocked:', data.promptFeedback);
            throw new Error(`Content Blocked: ${data.promptFeedback.blockReason}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const finishReason = data.candidates?.[0]?.finishReason;

        if (finishReason) {
            if (finishReason === 'MAX_TOKENS') {
                this._warnLog('[AIProvider] Generation hit MAX_TOKENS. Result may be truncated.');
            } else if (finishReason === 'MALFORMED_FUNCTION_CALL' && json) {
                this._warnLog('[AIProvider] MALFORMED_FUNCTION_CALL — initiating self-healing JSON repair...');
                const repairPrompt = `SYSTEM ALERT: You just generated malformed JSON that crashed the application.
Your Malformed Output: """${text || '(empty response)'}"""
TASK: Fix the syntax errors (missing commas, unclosed braces, escaped quotes, trailing commas) and return ONLY the valid JSON. Do not explain or add any text.`;
                return this.generateText(repairPrompt, { json: true, temperature: 0.1 });
            } else if (finishReason !== 'STOP') {
                throw new Error(`Generation Stopped: ${finishReason}`);
            }
        }

        if (search) {
            return {
                text: text || '',
                groundingMetadata: data.candidates?.[0]?.groundingMetadata,
            };
        }
        return text || '';
    }

    async _openaiGenerateText(prompt, { json, search, temperature, maxTokens, onProgress, localProfile = null, localUsage = null, signal = null } = {}) {
        // ── Additive local-only streaming progress (opt-in; Phase 1) ──────────
        // Cloud is untouched: gemini/claude use their own methods, and hosted
        // 'openai' is excluded by isLocalTextBackend(). This branch engages ONLY
        // when a progress sink is registered AND the backend is a genuine local
        // server. It returns the SAME concatenated string the non-stream path
        // would; ANY failure (or a buffered, non-streamable response) transparently
        // falls through to the unchanged non-stream request below. With no sink
        // registered, behavior is byte-identical to before.
        const _sink = (typeof onProgress === 'function')
            ? onProgress
            : ((typeof window !== 'undefined' && typeof window.__alloLocalTextProgress === 'function')
                ? window.__alloLocalTextProgress
                : null);
        const _localProgressBase = {
            backend: this.backend,
            model: (localProfile && localProfile.modelId) || this.models.default,
            contextWindow: localProfile && localProfile.contextWindow,
            contextSource: localProfile && localProfile.contextSource,
            maxTokens,
            promptTokens: localUsage && localUsage.promptTokens,
            requestedMaxTokens: localUsage && localUsage.requestedMaxTokens,
            clamped: localUsage && localUsage.clamped,
            promptLikelyTooLarge: localUsage && localUsage.promptLikelyTooLarge,
        };
        if (_sink && !search && isLocalTextBackend(this.backend)) {
            try {
                const streamed = await this._openaiStreamText(prompt, { json, temperature, maxTokens, localProfile, localUsage, signal }, _sink);
                if (typeof streamed === 'string') return streamed;
            } catch (streamErr) {
                if (streamErr && streamErr.name === 'AbortError') throw streamErr;
                this._warnLog('[AIProvider] local stream progress failed — falling back to non-stream:', streamErr && streamErr.message ? streamErr.message : streamErr);
                try { _sink({ ..._localProgressBase, phase: 'fallback', receivedChars: 0, chunks: 0, done: false }); } catch (_) {}
                // fall through to the unchanged non-stream path
            }
        }

        // OpenAI-compatible format (works with LocalAI, LM Studio, OpenAI, AlloFlow Local, custom endpoints)
        const url = this.backend === 'ollama'
            ? `${this.baseUrl}/api/chat`
            : `${this.baseUrl}/v1/chat/completions`;

        // If search is requested, augment prompt with web search results
        let effectivePrompt = prompt;
        if (search) {
            effectivePrompt = await this._webSearchAugment(prompt);
        }
        if (json) effectivePrompt += this._jsonPromptSuffix();

        const payload = this.backend === 'ollama'
            ? {
                model: this.models.default,
                messages: [{ role: 'user', content: effectivePrompt }],
                stream: false,
                ...(json ? { format: 'json' } : {}),
                options: {
                    num_predict: maxTokens,
                    ...(temperature !== null ? { temperature } : {}),
                },
            }
            : {
                model: this.models.default,
                messages: [{ role: 'user', content: effectivePrompt }],
                max_tokens: maxTokens,
                ...(json ? this._openaiJsonFormat() : {}),
                ...(temperature !== null ? { temperature } : {}),
            };

        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        let data;
        try {
            const response = await this._fetchWithRetry(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal,
            });
            data = await response.json();
        } finally {
            if (_sink && isLocalTextBackend(this.backend)) {
                try { _sink({ ..._localProgressBase, phase: 'done', done: true }); } catch (_) {}
            }
        }

        const text = this.backend === 'ollama'
            ? data.message?.content || ''
            : data.choices?.[0]?.message?.content || '';

        // Web search grounding for non-Gemini backends via DuckDuckGo
        if (search) {
            return { text, groundingMetadata: this._lastSearchMetadata || null };
        }
        return text;
    }

    // ── Additive local-only streaming helper (Phase 1) ────────────────────────
    // Streams an OpenAI-compatible (SSE) or Ollama (NDJSON) local completion,
    // firing `sink({ phase, backend, receivedChars, chunks, done })` as deltas
    // arrive, and returns the SAME final string the non-stream path produces.
    // Throws on any transport/parse problem so the caller falls back cleanly.
    async _openaiStreamText(prompt, { json, temperature, maxTokens, localProfile = null, localUsage = null, signal = null }, sink) {
        const isOllama = this.backend === 'ollama';
        const url = isOllama
            ? `${this.baseUrl}/api/chat`
            : `${this.baseUrl}/v1/chat/completions`;
        const progressBase = {
            backend: this.backend,
            model: (localProfile && localProfile.modelId) || this.models.default,
            contextWindow: localProfile && localProfile.contextWindow,
            contextSource: localProfile && localProfile.contextSource,
            maxTokens,
            promptTokens: localUsage && localUsage.promptTokens,
            requestedMaxTokens: localUsage && localUsage.requestedMaxTokens,
            clamped: localUsage && localUsage.clamped,
            promptLikelyTooLarge: localUsage && localUsage.promptLikelyTooLarge,
        };

        const streamPrompt = json ? (prompt + this._jsonPromptSuffix()) : prompt;
        const payload = isOllama
            ? {
                model: this.models.default,
                messages: [{ role: 'user', content: streamPrompt }],
                stream: true,
                ...(json ? { format: 'json' } : {}),
                options: {
                    num_predict: maxTokens,
                    ...(temperature != null ? { temperature } : {}),
                },
            }
            : {
                model: this.models.default,
                messages: [{ role: 'user', content: streamPrompt }],
                max_tokens: maxTokens,
                stream: true,
                ...(json ? this._openaiJsonFormat() : {}),
                ...(temperature != null ? { temperature } : {}),
            };

        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

        try { sink({ ...progressBase, phase: 'request', receivedChars: 0, chunks: 0, done: false }); } catch (_) {}

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal,
        });

        const body = response && response.body;
        if (!body || typeof body.getReader !== 'function') {
            // An injected fetchWithRetry may buffer/clone the response, so the
            // stream is gone — bail to the non-stream path.
            throw new Error('response body is not a readable stream');
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let acc = '';
        let chunks = 0;
        const emit = (done) => {
            try {
                sink({ ...progressBase, phase: 'stream', receivedChars: acc.length, chunks, done: Boolean(done) });
            } catch (_) { /* a broken sink must never break generation */ }
        };
        const consume = (line) => {
            const piece = isOllama ? this._parseOllamaStreamLine(line) : this._parseOpenAiStreamLine(line);
            if (piece === STREAM_DONE || !piece) return;
            acc += piece;
            chunks++;
            emit(false);
        };

        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let nl;
                while ((nl = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, nl).trim();
                    buffer = buffer.slice(nl + 1);
                    if (line) consume(line);
                }
            }
            const tail = buffer.trim();
            if (tail) consume(tail);
        } finally {
            try { if (typeof reader.releaseLock === 'function') reader.releaseLock(); } catch (_) { /* ignore */ }
        }

        emit(true);
        return acc;
    }

    // Parse one line of an Ollama /api/chat streaming response (NDJSON).
    // Returns the incremental content string ('' when the line carries none).
    _parseOllamaStreamLine(line) {
        try {
            const obj = JSON.parse(line);
            if (obj && obj.message && typeof obj.message.content === 'string') return obj.message.content;
        } catch (_) { /* keep-alive / partial line — skip */ }
        return '';
    }

    // Parse one line of an OpenAI-compatible SSE stream.
    // Returns incremental content, STREAM_DONE for the terminal marker, or ''.
    _parseOpenAiStreamLine(line) {
        if (line.indexOf('data:') === 0) line = line.slice(5).trim();
        if (!line) return '';
        if (line === '[DONE]') return STREAM_DONE;
        try {
            const obj = JSON.parse(line);
            const delta = obj && obj.choices && obj.choices[0] && obj.choices[0].delta;
            if (delta && typeof delta.content === 'string') return delta.content;
        } catch (_) { /* comment / partial line — skip */ }
        return '';
    }

    /**
     * Perform web search and augment prompt with results.
     * Uses DuckDuckGo Instant Answers API (free, no key required).
     */
    async _webSearchAugment(prompt) {
        try {
            if (typeof window !== 'undefined' && window.WebSearchProvider) {
                const { contextPrompt, groundingMetadata } = await window.WebSearchProvider.search(prompt, 10);
                if (contextPrompt) {
                    this._lastSearchMetadata = groundingMetadata;
                    return contextPrompt + prompt;
                }
            }
        } catch (err) {
            this._debugLog('[AIProvider] Web search augment failed:', err.message);
        }
        this._lastSearchMetadata = null;
        return prompt;
    }

    async _claudeGenerateText(prompt, { json, search, temperature, maxTokens, signal }) {
        const url = `${this.baseUrl}/v1/messages`;
        const payload = {
            model: this.models.default,
            max_tokens: maxTokens || 8192,
            messages: [{ role: 'user', content: prompt }],
            ...(temperature !== null ? { temperature } : {}),
        };

        // If search is requested, augment prompt with web search results
        if (search) {
            const augmented = await this._webSearchAugment(prompt);
            payload.messages[0].content = augmented;
        }

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(payload),
            signal,
        });
        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        if (search) {
            return { text, groundingMetadata: this._lastSearchMetadata || null };
        }
        return text;
    }

    // ─── IMAGE GENERATION ─────────────────────────────────────────────

    /**
     * Generate an image from a text prompt.
     * Replaces: callImagen(prompt, width, qual)
     * 
     * @param {string} prompt
     * @param {Object} [opts]
     * @param {number} [opts.width=300] - Target width
     * @param {number} [opts.quality=0.7] - JPEG quality
     * @returns {Promise<string>} data:image URL
     */
    _isSdTurboEligibleImageError(err) {
        if (!err) return false;
        const msg = String(err.message || err || '');
        if (/Safety|Block|content\s*policy|policy/i.test(msg)) return false;
        return Boolean(err.isConfigState || err.isRateLimited || /401|403|429|503|quota|RESOURCE_EXHAUSTED|Rate limited|rate limit/i.test(msg));
    }

    async _trySdTurboImage(prompt, width, quality) {
        const win = (typeof globalThis !== 'undefined' && globalThis.window)
            ? globalThis.window
            : ((typeof window !== 'undefined' && window.document) ? window : null);
        if (this.isCanvasEnv || !win) return null;
        try {
            if (win._sdTurbo?.ready && typeof win._sdTurbo.generate === 'function') {
                const localUrl = await win._sdTurbo.generate(prompt);
                if (localUrl) {
                    this._debugLog('[AIProvider] ✅ Image generated via local SD-Turbo');
                    return await this._optimizeImage(localUrl, width, quality);
                }
            }
        } catch (err) {
            this._warnLog(`[AIProvider] Local SD-Turbo image generation failed: ${err?.message || err}`);
        }
        return null;
    }

    _kickoffSdTurboLoad() {
        const win = (typeof globalThis !== 'undefined' && globalThis.window)
            ? globalThis.window
            : ((typeof window !== 'undefined' && window.document) ? window : null);
        if (this.isCanvasEnv || !win) return false;
        if (win._sdTurbo?.ready || win.__sdTurboDownloading || typeof win.__loadSdTurbo !== 'function') return false;
        const nav = win.navigator || (typeof navigator !== 'undefined' ? navigator : null);
        if (nav && !nav.gpu) return false;
        win.__sdTurboDownloading = true;
        Promise.resolve(win.__loadSdTurbo(() => {})).then(
            () => { win.__sdTurboDownloading = false; },
            (err) => {
                win.__sdTurboDownloading = false;
                this._warnLog(`[AIProvider] SD-Turbo preload failed: ${err?.message || err}`);
            }
        );
        return true;
    }

    async _generateImageByBackend(prompt, width, quality) {
        switch (this.backend) {
            case 'gemini':
                return this._geminiGenerateImage(prompt, width, quality);
            case 'claude':
            // Claude doesn't support image generation — fall through to OpenAI-compatible
            case 'openai':
            case 'localai':
            case 'lmstudio':
            case 'ollama':
            case 'alloflow-local':
            case 'custom':
            default:
                return this._openaiGenerateImage(prompt, width, quality);
        }
    }

    async generateImage(prompt, { width = 300, quality = 0.7 } = {}) {
        this._debugLog(`[AIProvider] generateImage: ${prompt?.substring(0, 50)}`);

        // Check imageProvider override from AI Backend Settings
        const _imgOvr = this._imageProvider || null;
        if (_imgOvr === 'off') throw new Error('Image generation is disabled in AI Backend Settings');

        if (_imgOvr === 'sd-local') {
            const local = await this._trySdTurboImage(prompt, width, quality);
            if (local) return local;
            this._kickoffSdTurboLoad();
            if (!this.apiKey && this.backend === 'gemini') {
                const err = new Error('Local image generator is still preparing and no cloud image API key is configured.');
                err.isConfigState = true;
                throw err;
            }
        }

        const runPrimary = () => {
            if (_imgOvr === 'imagen') return this._geminiGenerateImage(prompt, width, quality);
            if (_imgOvr === 'flux') return this._openaiGenerateImage(prompt, width, quality);
            return this._generateImageByBackend(prompt, width, quality);
        };

        try {
            return await runPrimary();
        } catch (err) {
            if (this._isSdTurboEligibleImageError(err)) {
                const local = await this._trySdTurboImage(prompt, width, quality);
                if (local) return local;
                if (_imgOvr === 'sd-local') this._kickoffSdTurboLoad();
            }
            throw err;
        }
    }

    async _geminiGenerateImage(prompt, width, quality) {
        const keyParam = this.apiKey ? `?key=${this.apiKey}` : '';
        const url = `${this.baseUrl}/models/${this.models.imagen}:predict${keyParam}`;
        const payload = {
            instances: [{ prompt }],
            parameters: { sampleCount: 1 },
        };

        const executeRequest = async () => {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.status === 401 || response.status === 429 || response.status === 503) {
                this._imagenRateLimited = true;
                this._warnLog(`[AIProvider] ⚠️ Imagen rate limited (${response.status})`);
                const error = new Error(`Rate limited: ${response.status}`);
                error.isRateLimited = true;
                throw error;
            }
            if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(`Imagen API Error: ${data.error.message || JSON.stringify(data.error)}`);
            }

            const base64 = data.predictions?.[0]?.bytesBase64Encoded;
            if (!base64) {
                throw new Error('No image generated (Likely Safety Block)');
            }

            this._debugLog(`[AIProvider] ✅ Image generated: ${base64.length} chars`);
            if (this._imagenRateLimited) {
                setTimeout(() => { this._imagenRateLimited = false; }, 30000);
            }

            const rawUrl = `data:image/png;base64,${base64}`;
            return await this._optimizeImage(rawUrl, width, quality);
        };

        const executeWithRetry = async (attempt = 0, maxAttempts = 3) => {
            try {
                return await executeRequest();
            } catch (err) {
                if (err.message && (err.message.includes('Safety') || err.message.includes('Block') || err.message.includes('400'))) {
                    throw err;
                }
                if (attempt < maxAttempts - 1) {
                    this._warnLog(`⏳ Image gen retry ${attempt + 1}/${maxAttempts}...`);
                    return executeWithRetry(attempt + 1, maxAttempts);
                }
                throw err;
            }
        };

        if (this._imagenRateLimited) {
            const queued = this._imagenQueue.then(executeWithRetry, () => executeWithRetry());
            this._imagenQueue = queued.catch(() => { });
            return queued;
        }
        return executeWithRetry();
    }

    async _openaiGenerateImage(prompt, width, quality) {
        // ── Try dedicated Flux image server first (port 7860) ──
        const fluxUrl = 'http://localhost:7860/v1/images/generations';
        try {
            const fluxResp = await fetch(fluxUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'flux',
                    prompt,
                    n: 1,
                    size: `${width}x${width}`,
                    response_format: 'b64_json',
                }),
                signal: AbortSignal.timeout((window.AlloFlowConfig && window.AlloFlowConfig.timeouts && window.AlloFlowConfig.timeouts.aiImageMs) || 180000), // user-configurable; default 3 min
            });
            if (fluxResp.ok) {
                const fluxData = await fluxResp.json();
                const base64 = fluxData.data?.[0]?.b64_json;
                if (base64) {
                    this._debugLog('[AIProvider] ✅ Image generated via Flux server');
                    return await this._optimizeImage(`data:image/png;base64,${base64}`, width, quality);
                }
            }
        } catch (fluxErr) {
            this._debugLog(`[AIProvider] Flux server not available (${fluxErr.message}), trying fallback...`);
        }

        // ── Fallback: Ollama's /api/generate or OpenAI-compatible endpoint ──
        const url = this.backend === 'ollama'
            ? `${this.baseUrl}/api/generate`
            : `${this.baseUrl}/v1/images/generations`;

        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

        const payload = this.backend === 'ollama'
            ? { model: this.models.image, prompt, stream: false }
            : { model: this.models.image, prompt, n: 1, size: `${width}x${width}`, response_format: 'b64_json' };

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        let base64;
        if (this.backend === 'ollama') {
            base64 = data.images?.[0];
        } else {
            base64 = data.data?.[0]?.b64_json;
        }

        if (!base64) throw new Error('No image generated');
        const rawUrl = `data:image/png;base64,${base64}`;
        return await this._optimizeImage(rawUrl, width, quality);
    }

    // ─── IMAGE EDITING ────────────────────────────────────────────────

    /**
     * Edit an existing image using AI.
     * Replaces: callGeminiImageEdit(prompt, base64Image, width, qual, referenceBase64)
     * 
     * @param {string} prompt - Edit instruction
     * @param {string} base64Image - Source image as base64
     * @param {Object} [opts]
     * @param {number} [opts.width=800]
     * @param {number} [opts.quality=0.9]
     * @param {string} [opts.referenceBase64] - Reference image for style matching
     * @returns {Promise<string>} Edited image as data:image URL
     */
    async editImage(prompt, base64Image, { width = 800, quality = 0.9, referenceBase64 = null } = {}) {
        this._debugLog(`[AIProvider] editImage: ${prompt?.substring(0, 50)}`);

        switch (this.backend) {
            case 'gemini':
                return this._geminiEditImage(prompt, base64Image, width, quality, referenceBase64);
            case 'openai':
            case 'localai':
            case 'lmstudio':
            case 'ollama':
            case 'claude':
            case 'alloflow-local':
            case 'custom':
            default:
                return this._openaiEditImage(prompt, base64Image, width, quality, referenceBase64);
        }
    }

    async _geminiEditImage(prompt, base64Image, width, quality, referenceBase64) {
        const keyParam = this.apiKey ? `?key=${this.apiKey}` : '';
        const url = `${this.baseUrl}/models/${this.models.image}:generateContent${keyParam}`;

        const parts = [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: base64Image } },
        ];
        if (referenceBase64) {
            parts.push({ text: 'Reference portrait to match:' });
            parts.push({ inlineData: { mimeType: 'image/png', data: referenceBase64 } });
        }

        const payload = {
            contents: [{ parts }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            const imagePart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!imagePart) throw new Error('No image generated in response');
            const rawUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
            return await this._optimizeImage(rawUrl, width, quality);
        } catch (err) {
            this._warnLog('[AIProvider] Image Edit Error', err);
            throw err;
        }
    }

    async _openaiEditImage(prompt, base64Image, width, quality, _referenceBase64) {
        // ── Try dedicated Flux image server first (port 7860) ──
        const fluxEditUrl = 'http://localhost:7860/v1/images/edits';
        try {
            const fluxResp = await fetch(fluxEditUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'flux',
                    prompt,
                    image: base64Image,
                    n: 1,
                    size: `${width}x${width}`,
                    response_format: 'b64_json',
                    strength: 0.75,
                }),
                signal: AbortSignal.timeout((window.AlloFlowConfig && window.AlloFlowConfig.timeouts && window.AlloFlowConfig.timeouts.aiImageMs) || 180000),
            });
            if (fluxResp.ok) {
                const fluxData = await fluxResp.json();
                const base64 = fluxData.data?.[0]?.b64_json;
                if (base64) {
                    this._debugLog('[AIProvider] ✅ Image edited via Flux server');
                    return await this._optimizeImage(`data:image/png;base64,${base64}`, width, quality);
                }
            }
        } catch (fluxErr) {
            this._debugLog(`[AIProvider] Flux edit server not available (${fluxErr.message}), trying fallback...`);
        }

        // ── Fallback: OpenAI-compatible image edit endpoint ──
        const url = `${this.baseUrl}/v1/images/edits`;

        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

        const payload = {
            model: this.models.image,
            prompt,
            image: base64Image,
            n: 1,
            size: `${width}x${width}`,
            response_format: 'b64_json',
        };

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        const base64 = data.data?.[0]?.b64_json;
        if (!base64) throw new Error('No edited image generated');
        const rawUrl = `data:image/png;base64,${base64}`;
        return await this._optimizeImage(rawUrl, width, quality);
    }

    // ─── VISION / IMAGE ANALYSIS ──────────────────────────────────────

    /**
     * Analyze an image using a multimodal model.
     * Replaces: callGeminiVision(prompt, base64Data, mimeType)
     * 
     * @param {string} prompt
     * @param {string} base64Data
     * @param {Object} [opts]
     * @param {string} [opts.mimeType='image/png']
     * @returns {Promise<string>} Analysis text
     */
    async analyzeImage(prompt, base64Data, { mimeType = 'image/png' } = {}) {
        this._debugLog(`[AIProvider] analyzeImage: ${prompt?.substring(0, 50)}`);

        switch (this.backend) {
            case 'gemini':
                return this._geminiAnalyzeImage(prompt, base64Data, mimeType);
            case 'openai':
            case 'localai':
            case 'lmstudio':
            case 'ollama':
            case 'claude':
            case 'alloflow-local':
            case 'custom':
            default:
                return this._openaiAnalyzeImage(prompt, base64Data, mimeType);
        }
    }

    async _geminiAnalyzeImage(prompt, base64Data, mimeType) {
        const keyParam = this.apiKey ? `?key=${this.apiKey}` : '';
        const url = `${this.baseUrl}/models/${this.models.vision}:generateContent${keyParam}`;

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType, data: base64Data } },
                ],
            }],
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    async _openaiAnalyzeImage(prompt, base64Data, mimeType) {
        const url = this.backend === 'ollama'
            ? `${this.baseUrl}/api/chat`
            : `${this.baseUrl}/v1/chat/completions`;

        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

        const messages = [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            ],
        }];

        const payload = this.backend === 'ollama'
            ? { model: this.models.vision, messages, stream: false }
            : { model: this.models.vision, messages };

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        return this.backend === 'ollama'
            ? data.message?.content || ''
            : data.choices?.[0]?.message?.content || '';
    }

    // ─── AUDIO ANALYSIS (Phase 3v.4) ─────────────────────────────────
    /**
     * Send audio + a text prompt to the model. Mirrors analyzeImage
     * shape but with audio MIME types. Returns plain text — callers
     * who want structured output (transcript + score + ack) ask for
     * JSON in their prompt and parse the result.
     *
     * Used by voice_module.js:gradeAudioJustification — the primary
     * path for arcade Boss Encounter card-play justification grading.
     * Collapses transcription + grading into a single API call.
     *
     * @param {string} prompt
     * @param {string} base64Data
     * @param {Object} [opts]
     * @param {string} [opts.mimeType='audio/webm']  — supported by Gemini in
     *   practice; falls back to ogg/wav/mp3/aac/flac per Google docs.
     *   AlloHaven's MediaRecorder default is audio/webm;codecs=opus.
     * @returns {Promise<string>} Model response text
     */
    async analyzeAudio(prompt, base64Data, { mimeType = 'audio/webm' } = {}) {
        this._debugLog(`[AIProvider] analyzeAudio: ${prompt?.substring(0, 60)}`);
        switch (this.backend) {
            case 'gemini':
                return this._geminiAnalyzeAudio(prompt, base64Data, mimeType);
            case 'openai':
            case 'localai':
            case 'lmstudio':
            case 'ollama':
            case 'claude':
            case 'alloflow-local':
            case 'custom':
            default:
                // Most non-Gemini backends don't accept audio inline. For oral-
                // reading fluency the on-device path is now real: the desktop
                // School Box runs a managed whisper.cpp server (/api/asr/*) and
                // fluency_module.js exposes transcribeAudioLocal / analyzeFluencyLocal
                // (transcribe on-device, then align to the passage). This throw
                // remains for other audio-grading callers (e.g. AlloHaven) that
                // still expect a single analyze-and-grade call.
                throw new Error('Audio input not supported on this backend (' + this.backend + '). For reading fluency use window.analyzeFluencyLocal (on-device whisper.cpp); otherwise transcribe first, then grade text.');
        }
    }

    async _geminiAnalyzeAudio(prompt, base64Data, mimeType) {
        const keyParam = this.apiKey ? `?key=${this.apiKey}` : '';
        // Use the vision/multimodal model — Gemini's flash/pro vision
        // models accept audio in the same payload shape.
        const url = `${this.baseUrl}/models/${this.models.vision}:generateContent${keyParam}`;

        // Strip any data:audio/...;base64, prefix the caller may have left
        // on the string (recordAudioBlob returns a full data URI).
        let cleanData = base64Data || '';
        const m = cleanData.match(/^data:([^;]+);base64,(.+)$/);
        if (m) {
            mimeType = m[1] || mimeType;
            cleanData = m[2];
        }

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType, data: cleanData } },
                ],
            }],
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message || 'Gemini audio analysis failed');
        }
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // ─── TEXT-TO-SPEECH ───────────────────────────────────────────────

    /**
     * Convert text to speech audio.
     * Replaces: callTTS, callTTSDirect, fetchTTSBytes
     * 
     * In Canvas mode, falls back to browser speechSynthesis.
     * On Gemini, uses Gemini TTS API.
     * On local backends, routes: Kokoro (8 langs) → Edge TTS (40+) → browser fallback.
     * 
     * @param {string} text
     * @param {Object} [opts]
     * @param {string} [opts.voice='Puck']
     * @param {number} [opts.speed=1]
     * @param {string} [opts.language] - Language hint for TTS tiering
     * @returns {Promise<string|null>} Audio URL or null
     */
    async textToSpeech(text, { voice = 'Puck', speed = 1, language = null } = {}) {
        if (!text) return null;

        // Canvas mode: always use browser speechSynthesis
        if (this.isCanvasEnv) {
            return this._browserSpeechSynthesis(text, speed);
        }

        this._debugLog(`[AIProvider] textToSpeech: "${text?.substring(0, 30)}..." voice=${voice}`);

        // Check ttsProvider override from AI Backend Settings
        const _ttsOvr = this._ttsProvider || null;
        if (_ttsOvr === 'off') return null;
        if (_ttsOvr === 'browser') return this._browserSpeechSynthesis(text, speed);
        if (_ttsOvr === 'gemini') return this._geminiTTS(text, voice, speed);
        if (_ttsOvr === 'local') return this._openaiTTS(text, voice, speed);

        // Default: route by backend
        switch (this.backend) {
            case 'gemini':
                return this._geminiTTS(text, voice, speed);
            case 'openai':
            case 'localai':
            case 'lmstudio':
            case 'ollama':
            case 'claude':
            case 'alloflow-local':
            case 'custom':
            default:
                return this._openaiTTS(text, voice, speed);
        }
    }

    _browserSpeechSynthesis(text, speed) {
        if (window.speechSynthesis && text) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = speed || 1;
            window.speechSynthesis.speak(utter);
        }
        return null;
    }

    async _geminiTTS(text, voice, speed) {
        // Rate limit check
        if (Date.now() < this._ttsRateLimitedUntil) {
            this._warnLog('[AIProvider TTS] Skipping — rate-limit cooldown active');
            return null;
        }

        // Cache check
        const cacheKey = `${(text || '').toLowerCase().trim()}__${voice}__${speed}`;
        if (this._ttsCache.has(cacheKey)) {
            this._debugLog('⚡ TTS cache HIT:', text?.substring(0, 30));
            return this._ttsCache.get(cacheKey);
        }

        // Queue for serialization
        const task = this._ttsQueue.then(async () => {
            const keyParam = this.apiKey ? `?key=${this.apiKey}` : '';
            const url = `${this.baseUrl}/models/${this.models.tts}:generateContent${keyParam}`;

            const payload = {
                contents: [{ parts: [{ text }] }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voice },
                        },
                    },
                },
            };

            for (let attempt = 0; attempt <= 2; attempt++) {
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });

                    if (response.status === 429) {
                        this._ttsRateLimitedUntil = Date.now() + 60000;
                        this._warnLog('[AIProvider TTS] ⚠️ 429 — 60s cooldown');
                        return null;
                    }

                    const data = await response.json();
                    const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                    if (!audioPart) throw new Error('No audio in response');

                    const base64 = audioPart.inlineData.data;
                    const binaryString = window.atob(base64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }

                    // PCM to WAV conversion
                    const wavBuffer = this._pcmToWav(bytes, 24000, 1);
                    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(blob);
                    this._ttsCache.set(cacheKey, audioUrl);
                    return audioUrl;
                } catch (e) {
                    if (attempt < 2) {
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                    } else {
                        this._warnLog('[AIProvider TTS] All retries exhausted:', e.message);
                        throw e;
                    }
                }
            }
        });
        this._ttsQueue = task.catch(() => { });
        return task;
    }

    async _openaiTTS(text, voice, speed) {
        // TTS tiering: Kokoro (high quality) → Edge TTS (wide language) → browser fallback
        const ttsEndpoints = [
            'http://localhost:8880/v1/audio/speech',  // Kokoro (high quality, 8 langs)
            'http://localhost:5001/v1/audio/speech',  // Edge TTS (28 neural voices, 20 langs)
            'http://localhost:5500/v1/audio/speech',  // Edge TTS (40+ langs, OpenAI-compat)
        ];

        // Cache check
        const cacheKey = `${(text || '').toLowerCase().trim()}__${voice}__${speed}`;
        if (this._ttsCache.has(cacheKey)) {
            this._debugLog('⚡ TTS cache HIT:', text?.substring(0, 30));
            return this._ttsCache.get(cacheKey);
        }

        for (const url of ttsEndpoints) {
            try {
                const payload = {
                    model: this.models.tts,
                    input: text,
                    voice: voice?.toLowerCase() || 'alloy',
                    speed: speed || 1,
                    response_format: 'wav',
                };

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                if (!response.ok) throw new Error(`TTS returned ${response.status}`);
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                this._ttsCache.set(cacheKey, audioUrl);
                this._debugLog(`[AIProvider TTS] ✅ Success from ${url}`);
                return audioUrl;
            } catch (err) {
                this._debugLog(`[AIProvider TTS] ${url} failed: ${err.message}, trying next...`);
            }
        }

        // All TTS servers failed — use browser speech as final fallback
        this._warnLog('[AIProvider TTS] All TTS servers unavailable, using browser speech');
        return this._browserSpeechSynthesis(text, speed);
    }

    // ─── SAFETY ───────────────────────────────────────────────────────

    /**
     * Check content for safety. Returns flagged categories or null if safe.
     * Replaces: GEMINI_MODELS.safety based checks
     */
    async checkSafety(content) {
        if (!content || content.length < 5) return null;

        try {
            const result = await this.generateText(
                `Analyze this content for safety. Return JSON: {"safe": true/false, "reason": "explanation if unsafe"}\n\nContent: ${content.substring(0, 500)}`,
                { json: true, temperature: 0.1 }
            );
            return JSON.parse(result);
        } catch (e) {
            this._warnLog('[AIProvider] Safety check failed:', e.message);
            return { safe: true, reason: 'Safety check unavailable' };
        }
    }

    // ─── MODEL DISCOVERY ──────────────────────────────────────────────

    /**
     * List available models from the current backend.
     * Used by Settings UI for smart model detection.
     */
    async listAvailableModels({ signal = null } = {}) {
        try {
            let url;
            const headers = { 'Content-Type': 'application/json' };

            switch (this.backend) {
                case 'ollama':
                    url = `${this.baseUrl}/api/tags`;
                    break;
                case 'gemini':
                    url = `${this.baseUrl}/models?key=${this.apiKey}`;
                    break;
                case 'claude':
                    return [
                        { id: 'claude-sonnet-4-20250514', type: 'text' },
                        { id: 'claude-3-5-haiku-20241022', type: 'text' },
                    ];
                default:
                    url = `${this.baseUrl}/v1/models`;
                    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
                    break;
            }

            const response = await fetch(url, { headers, signal });
            if (!response || !response.ok) {
                const status = response && response.status ? response.status : 'network';
                const statusText = response && response.statusText ? ': ' + response.statusText : '';
                throw new Error(`Model discovery failed (HTTP ${status}${statusText})`);
            }
            const data = await response.json();

            if (this.backend === 'ollama') {
                return (data.models || []).map(m => ({ id: m.name, type: 'text' }));
            } else if (this.backend === 'gemini') {
                return (data.models || [])
                    .filter(m => !Array.isArray(m.supportedGenerationMethods) || m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => ({ id: m.name?.replace('models/', ''), type: 'text' }));
            } else {
                return (data.data || []).map(m => ({ id: m.id, type: 'text' }));
            }
        } catch (e) {
            this._warnLog('[AIProvider] Model discovery failed:', e.message);
            return [];
        }
    }

    // ─── TEST CONNECTION ──────────────────────────────────────────────

    /**
     * Test if the backend is reachable.
     * Used by Settings UI "Test Connection" button.
     */
    async testConnection() {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
        try {
            const models = await this.listAvailableModels({ signal: controller ? controller.signal : null });
            const usableModels = (models || []).filter(model => model && String(model.id || '').trim());
            const currentModel = String(this.models.default || '').trim();
            const listedCurrent = usableModels.find(model => model.id === currentModel);
            const selectedModel = (listedCurrent && listedCurrent.id)
                || (usableModels[0] && usableModels[0].id)
                || currentModel;
            if (!selectedModel) throw new Error('No compatible text model is available from this provider.');

            // A catalog request alone does not prove that the key can generate,
            // that browser CORS is allowed, or that the selected model is usable.
            // Make the smallest real text request and require a non-empty reply.
            this.models.default = selectedModel;
            this.models.flash = selectedModel;
            const reply = await this.generateText('Reply with only OK.', {
                json: false,
                search: false,
                temperature: 0,
                maxTokens: 8,
                signal: controller ? controller.signal : null,
            });
            const replyText = typeof reply === 'string' ? reply.trim() : String(reply?.text || '').trim();
            if (!replyText) throw new Error('The provider returned an empty text response.');

            const verifiedModels = usableModels.length > 0
                ? usableModels
                : [{ id: selectedModel, type: 'text' }];
            return {
                success: true,
                modelCount: verifiedModels.length,
                models: verifiedModels,
                selectedModel,
                capabilities: {
                    text: true,
                    vision: false,
                    image: false,
                    imageEdit: false,
                    audio: false,
                },
            };
        } catch (e) {
            const timedOut = e && e.name === 'AbortError';
            return {
                success: false,
                error: timedOut ? 'Connection test timed out after 15 seconds.' : (e && e.message ? e.message : String(e)),
            };
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    // ─── UTILITIES ────────────────────────────────────────────────────

    /** Convert raw PCM bytes to WAV format */
    _pcmToWav(pcmBytes, sampleRate = 24000, numChannels = 1) {
        const bytesPerSample = 2; // 16-bit
        const dataSize = pcmBytes.length;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
        view.setUint16(32, numChannels * bytesPerSample, true);
        view.setUint16(34, bytesPerSample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        const pcmView = new Uint8Array(buffer, 44);
        pcmView.set(pcmBytes);

        return buffer;
    }
}

// Make available globally (for inline usage in AlloFlowANTI.txt)
if (typeof window !== 'undefined') {
    window.AIProvider = AIProvider;
}

// Node/CommonJS export — test harness only. Guarded so the browser <script>
// load is unaffected (`module` is undefined there). Purely additive.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AIProvider,
        LOCAL_BACKENDS: LOCAL_BACKENDS.slice(),
        isLocalTextBackend,
        buildLocalModelProfile,
        tuneLocalTextOptions,
        buildLocalTaskSupportFromProbe,
        localModelSupportsTask,
    };
}

    console.log('[AI Backend Module] Loaded: WebSearchProvider + AIProvider + Firebase Shim Factory');
})();
