/**
 * AlloFlow AI Provider — Backend-Agnostic AI Abstraction Layer
 * 
 * Copyright (C) 2026 Aaron Pomeranz, PsyD
 * Licensed under GNU AGPL v3 (same as AlloFlow core)
 * 
 * This module provides a unified interface for all AI operations,
 * supporting multiple backends: Gemini, LocalAI, Ollama, OpenAI, Claude, or any
 * OpenAI-compatible custom endpoint.
 * 
 * Usage:
 *   const ai = new AIProvider({ backend: 'gemini', apiKey, models: {...} });
 *   const text = await ai.generateText('Write a poem', { json: false });
 *   const image = await ai.generateImage('A sunset', { width: 800 });
 *   const edited = await ai.editImage('Remove text', base64, { width: 800 });
 *   const audio = await ai.textToSpeech('Hello world', { voice: 'Puck' });
 */

// ─── AI Provider Class ────────────────────────────────────────────────────────

class AIProvider {

    /**
     * @param {Object} config
     * @param {string} config.backend - 'gemini' | 'openai' | 'localai' | 'ollama' | 'claude' | 'custom'
     * @param {string} [config.apiKey] - API key (empty string for Canvas mode)
     * @param {string} [config.baseUrl] - Base URL for the API (required for localai/ollama/custom)
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
        this.models = {
            default: config.models?.default || 'gemini-2.5-flash',
            fallback: config.models?.fallback || 'gemini-2.5-flash',
            flash: config.models?.flash || config.models?.default || 'gemini-2.5-flash',
            image: config.models?.image || 'gemini-2.5-flash-image',
            imagen: config.models?.imagen || 'imagen-4.0-generate-001',
            tts: config.models?.tts || 'gemini-2.5-flash',
            safety: config.models?.safety || 'gemini-2.5-flash-lite',
            vision: config.models?.vision || config.models?.default || 'gemini-2.5-flash',
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

        this._debugLog(`[AIProvider] Initialized: backend=${this.backend}, isCanvas=${this.isCanvasEnv}`);
    }

    _defaultBaseUrl() {
        switch (this.backend) {
            case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta';
            case 'localai': return 'http://localhost:8080';
            case 'ollama': return 'http://localhost:11434';
            case 'openai': return 'https://api.openai.com';
            case 'claude': return 'https://api.anthropic.com';
            case 'custom': return 'http://localhost:8080';
            default: return 'https://generativelanguage.googleapis.com/v1beta';
        }
    }

    // ─── TEXT GENERATION ──────────────────────────────────────────────

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
    async generateText(prompt, { json = false, search = false, temperature = null, maxTokens = 8192 } = {}) {
        if (!prompt) return json ? '{}' : '';
        this._debugLog(`[AIProvider] generateText: backend=${this.backend}, json=${json}, search=${search}`);

        switch (this.backend) {
            case 'gemini':
                return this._geminiGenerateText(prompt, { json, search, temperature, maxTokens });
            case 'claude':
                return this._claudeGenerateText(prompt, { json, search, temperature, maxTokens });
            case 'openai':
            case 'localai':
            case 'ollama':
            case 'custom':
            default:
                return this._openaiGenerateText(prompt, { json, search, temperature, maxTokens });
        }
    }

    async _geminiGenerateText(prompt, { json, search, temperature, maxTokens }) {
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
        };

        let response;
        try {
            response = await this._fetchWithRetry(buildUrl(this.models.default), fetchOpts);
        } catch (primaryErr) {
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

    async _openaiGenerateText(prompt, { json, search, temperature, maxTokens }) {
        // OpenAI-compatible format (works with LocalAI, Ollama, OpenAI, custom endpoints)
        const url = this.backend === 'ollama'
            ? `${this.baseUrl}/api/chat`
            : `${this.baseUrl}/v1/chat/completions`;

        const payload = {
            model: this.models.default,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            ...(json ? { response_format: { type: 'json_object' } } : {}),
            ...(temperature !== null ? { temperature } : {}),
        };

        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const data = await response.json();

        const text = this.backend === 'ollama'
            ? data.message?.content || ''
            : data.choices?.[0]?.message?.content || '';

        // Search grounding not supported on non-Gemini backends — return plain text
        if (search) {
            return { text, groundingMetadata: null };
        }
        return text;
    }

    async _claudeGenerateText(prompt, { json, search, temperature, maxTokens }) {
        const url = `${this.baseUrl}/v1/messages`;
        const payload = {
            model: this.models.default,
            max_tokens: maxTokens || 8192,
            messages: [{ role: 'user', content: prompt }],
            ...(temperature !== null ? { temperature } : {}),
        };

        const response = await this._fetchWithRetry(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        if (search) {
            return { text, groundingMetadata: null };
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
    async generateImage(prompt, { width = 300, quality = 0.7 } = {}) {
        this._debugLog(`[AIProvider] generateImage: ${prompt?.substring(0, 50)}`);

        // Check imageProvider override from AI Backend Settings
        const _imgOvr = this._imageProvider || null;
        if (_imgOvr === 'off') throw new Error('Image generation is disabled in AI Backend Settings');
        if (_imgOvr === 'imagen') return this._geminiGenerateImage(prompt, width, quality);
        if (_imgOvr === 'flux') return this._openaiGenerateImage(prompt, width, quality);

        // Default: route by backend
        switch (this.backend) {
            case 'gemini':
                return this._geminiGenerateImage(prompt, width, quality);
            case 'claude':
            // Claude doesn't support image generation — fall through to OpenAI-compatible
            case 'openai':
            case 'localai':
            case 'ollama':
            case 'custom':
            default:
                return this._openaiGenerateImage(prompt, width, quality);
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
            case 'ollama':
            case 'claude':
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
        // OpenAI-compatible image edit endpoint (used by LocalAI with FLUX Kontext)
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
            case 'ollama':
            case 'claude':
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

    // ─── TEXT-TO-SPEECH ───────────────────────────────────────────────

    /**
     * Convert text to speech audio.
     * Replaces: callTTS, callTTSDirect, fetchTTSBytes
     * 
     * In Canvas mode, falls back to browser speechSynthesis.
     * On Gemini, uses Gemini TTS API.
     * On local backends, routes: Kokoro (8 langs) → Piper (40+) → browser fallback.
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
            case 'ollama':
            case 'claude':
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
        // TTS tiering: Kokoro (high quality) → Piper (wide language) → browser fallback
        const ttsEndpoints = [
            'http://localhost:8880/v1/audio/speech',  // Kokoro (high quality, 8 langs)
            'http://localhost:5500/v1/audio/speech',  // Piper (40+ langs, OpenAI-compat)
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
    async listAvailableModels() {
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

            const response = await fetch(url, { headers });
            const data = await response.json();

            if (this.backend === 'ollama') {
                return (data.models || []).map(m => ({ id: m.name, type: 'text' }));
            } else if (this.backend === 'gemini') {
                return (data.models || []).map(m => ({ id: m.name?.replace('models/', ''), type: 'text' }));
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
        try {
            const models = await this.listAvailableModels();
            return { success: true, modelCount: models.length, models };
        } catch (e) {
            return { success: false, error: e.message };
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
