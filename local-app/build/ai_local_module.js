/**
 * AlloFlow — Local AI Provider Module (C2.1)
 *
 * LM Studio (llama.cpp) AIProvider for the local app.
 * Uses OpenAI-compatible API on port 8000.
 * Loaded by index.html BEFORE app.js so modules can do `new AIProvider(cfg)`.
 *
 * Cloud backends (Gemini, OpenAI, Claude) are intentionally absent.
 * TTS: Piper WASM first → browser speechSynthesis fallback.
 * Images: disabled (returns null).
 *
 * Sets:
 *   window.AIProvider          — the class (for new AIProvider(config))
 *   window.__alloShared.ai     — initialized instance (via setAI if context loaded)
 */

(function (global) {
    'use strict';

    // ── LocalAIProvider class ─────────────────────────────────────────────────

    class LocalAIProvider {
        /**
         * @param {Object} [config]
         * @param {string} [config.baseUrl]     - LM Studio URL (default: __alloLocalConfig.llmEngineUrl)
         * @param {Object} [config.models]      - Model name overrides
         * @param {string} [config.ttsProvider] - 'piper' | 'browser' | 'off' (default: 'piper')
         * @param {Function} [config.debugLog]
         * @param {Function} [config.warnLog]
         */
        constructor(config = {}) {
            this.backend = 'lmstudio';
            this._ttsProvider = config.ttsProvider || 'piper';
            this._imageProvider = 'off'; // images disabled in local app

            this._cfgBaseUrl = config.baseUrl || null; // null = read live from __alloLocalConfig
            this.models = {
                default: config.models?.default || null, // null = read live
                tts: config.models?.tts || 'en_US-amy-medium',
            };

            this._debugLog = config.debugLog || (() => {});
            this._warnLog  = config.warnLog  || console.warn.bind(console);

            // TTS cache + serialization queue
            this._ttsCache = new Map();
            this._ttsQueue = Promise.resolve();
        }

        // ── Live config reads (allows admin to change URL without page reload) ──

        get baseUrl() {
            return this._cfgBaseUrl
                || global.__alloLocalConfig?.llmEngineUrl
                || global.__alloLocalConfig?.ollamaUrl
                || 'http://localhost:1234';
        }

        get model() {
            return this.models.default
                || global.__alloLocalConfig?.defaultModel
                || 'default';
        }

        // ── Text Generation ────────────────────────────────────────────────────

        /**
         * Generate text using OpenAI-compatible /v1/chat/completions endpoint.
         * @param {string} prompt
         * @param {Object} [opts]
         * @param {boolean} [opts.json=false]       - Request JSON output
         * @param {number}  [opts.temperature]      - Sampling temperature
         * @param {number}  [opts.maxTokens=8192]   - Max tokens
         * @returns {Promise<string|Object>}
         */
        async generateText(prompt, { json = false, temperature = null, maxTokens = 8192 } = {}) {
            if (!prompt) return json ? '{}' : '';

            const url = `${this.baseUrl}/v1/chat/completions`;
            const payload = {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                max_tokens: maxTokens,
                ...(temperature !== null ? { temperature } : {}),
                ...(json ? { response_format: { type: 'json_object' } } : {}),
            };

            this._debugLog(`[LocalAI] generateText: model=${this.model}, json=${json}`);

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!resp.ok) {
                throw new Error(`LLM error: HTTP ${resp.status} — is LM Studio running at ${this.baseUrl}?`);
            }

            const data = await resp.json();
            return data.choices?.[0]?.message?.content || '';
        }

        // ── Text-to-Speech ────────────────────────────────────────────────────

        /**
         * Convert text to speech.
         * Routes: Piper WASM → browser speechSynthesis fallback.
         * @param {string} text
         * @param {Object} [opts]
         * @param {string} [opts.voice='en_US-amy-medium']
         * @param {number} [opts.speed=1]
         * @returns {Promise<string|null>} Audio URL or null (browser TTS returns null)
         */
        async textToSpeech(text, { voice = 'en_US-amy-medium', speed = 1 } = {}) {
            if (!text || this._ttsProvider === 'off') return null;
            if (this._ttsProvider === 'browser') return this._browserTTS(text, speed);

            // Try Piper HTTP server (port 5500 — started by nativeProcessManager)
            const piperServerUrl = global.__alloLocalConfig?.ttsServerUrl || 'http://localhost:5500';
            try {
                const resp = await fetch(`${piperServerUrl}/v1/audio/speech`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'tts-1', input: text, voice: voice || 'nova', speed }),
                    signal: AbortSignal.timeout(8000),
                });
                if (resp.ok) {
                    const blob = await resp.blob();
                    const url = URL.createObjectURL(blob);
                    this._ttsCache.set(`piper-http:${text}:${voice}:${speed}`, url);
                    return url;
                }
            } catch {
                // Piper server not running — fall through
            }

            // Try Piper WASM if loaded
            if (global._piperTTS && global.__alloLocalConfig?.piperEnabled !== false) {
                const cacheKey = `piper:${text}:${voice}:${speed}`;
                if (this._ttsCache.has(cacheKey)) {
                    return this._ttsCache.get(cacheKey);
                }
                try {
                    const audioUrl = await global._piperTTS.speak(text, voice, speed);
                    if (audioUrl) {
                        this._ttsCache.set(cacheKey, audioUrl);
                        return audioUrl;
                    }
                } catch (e) {
                    this._warnLog('[LocalAI TTS] Piper WASM failed:', e.message);
                }
            }

            // No local TTS available — return null so caller (AlloBot) handles browser fallback
            return null;
        }

        _browserTTS(text, speed) {
            if (global.speechSynthesis && text) {
                global.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                utter.rate = typeof speed === 'number' ? speed : 1;
                global.speechSynthesis.speak(utter);
            }
            return null;
        }

        // ── Image Generation (disabled) ────────────────────────────────────────

        /** Image generation is disabled in the local app. Always returns null. */
        async generateImage() {
            this._warnLog('[LocalAI] Image generation is not available in local mode.');
            return null;
        }

        /** Image editing is disabled in the local app. Always returns null. */
        async editImage() {
            this._warnLog('[LocalAI] Image editing is not available in local mode.');
            return null;
        }

        // ── Safety Check ───────────────────────────────────────────────────────

        async checkSafety(content) {
            if (!content || content.length < 5) return { safe: true };
            try {
                const result = await this.generateText(
                    `You are a content safety checker for a K-12 educational app. ` +
                    `Reply ONLY with valid JSON: {"safe": true/false, "reason": "brief explanation if unsafe"}.\n\n` +
                    `Content: ${content.substring(0, 400)}`,
                    { json: true, temperature: 0.1 }
                );
                const parsed = JSON.parse(result);
                return { safe: Boolean(parsed.safe), reason: parsed.reason || '' };
            } catch {
                return { safe: true, reason: 'Safety check unavailable' };
            }
        }

        // ── Model Discovery ────────────────────────────────────────────────────

        /** List available LM Studio models. */
        async listAvailableModels() {
            try {
                const resp = await fetch(`${this.baseUrl}/v1/models`, {
                    signal: AbortSignal.timeout(3000),
                });
                if (!resp.ok) return [];
                const data = await resp.json();
                return (data.data || []).map(m => ({ id: m.id, type: 'text', size: null }));
            } catch {
                return [];
            }
        }

        /** Test LM Studio connection. */
        async testConnection() {
            try {
                const models = await this.listAvailableModels();
                return { success: true, modelCount: models.length, models };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    }

    // ── Expose class on window ────────────────────────────────────────────────
    // Module code in AlloFlowANTI.txt may do `new AIProvider(cfg)`.
    // The LocalAIProvider constructor accepts (and ignores) any cloud-backend config.
    global.AIProvider = LocalAIProvider;

    // ── Create default instance ───────────────────────────────────────────────
    const _defaultInstance = new LocalAIProvider();

    // Wire into shared context if already loaded (e.g., loaded in non-deferred order)
    if (global.__alloShared && typeof global.__alloShared.setAI === 'function') {
        global.__alloShared.setAI(_defaultInstance);
    }

    // If shared context loads after us, it will pick up via getAI() → window.AIProvider.
    // Expose instance explicitly for modules that use window.__alloLocalAI directly.
    global.__alloLocalAI = _defaultInstance;

    // ── Piper TTS stub ────────────────────────────────────────────────────────
    // Provides the window._piperTTS interface as a stub so code that checks
    // `if (window._piperTTS)` doesn't crash if the full Piper WASM isn't loaded.
    // The real Piper module will overwrite this when available.
    if (!global._piperTTS) {
        global._piperTTS = null; // explicit null — Piper not loaded, will fall back to browser TTS
    }

})(window);
