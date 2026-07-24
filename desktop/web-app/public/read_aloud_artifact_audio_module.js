(function(){"use strict";
if(window.AlloModules&&window.AlloModules.ReadAloudArtifactAudioModule){console.log("[CDN] ReadAloudArtifactAudioModule already loaded, skipping"); return;}
// read_aloud_artifact_audio_source.jsx
//
// Shared, explicit-save narration preparation for portable read-aloud
// artifacts. Live karaoke remains ephemeral; this module creates an isolated
// V4 store only when an owner asks to include narration in an export/save.

const createReadAloudArtifactAudio = (dependencies = {}) => {
    const getAudioServiceModule = typeof dependencies.getAudioServiceModule === 'function'
        ? dependencies.getAudioServiceModule
        : () => (typeof window !== 'undefined' && window.AlloModules
            ? window.AlloModules
            : null);
    const getStoreModule = typeof dependencies.getStoreModule === 'function'
        ? dependencies.getStoreModule
        : () => (typeof window !== 'undefined' && window.AlloModules
            ? window.AlloModules.KaraokeAudioStore
            : null);
    const callTTS = typeof dependencies.callTTS === 'function'
        ? dependencies.callTTS
        : (...args) => {
            if (typeof window !== 'undefined' && typeof window.callTTS === 'function') {
                return window.callTTS(...args);
            }
            throw artifactAudioError('tts-unavailable', 'Text-to-speech is not available for this artifact.');
        };
    const fetchAudio = typeof dependencies.fetch === 'function'
        ? dependencies.fetch
        : (...args) => {
            if (typeof fetch === 'function') return fetch(...args);
            throw artifactAudioError('fetch-unavailable', 'Audio bytes cannot be loaded in this environment.');
        };

    function artifactAudioError(code, message, detail) {
        const error = new Error(message);
        error.code = code;
        if (detail !== undefined) error.detail = detail;
        return error;
    }

    function cleanToken(value, fallback, max = 160) {
        const clean = String(value == null ? '' : value).trim();
        return (clean || fallback).slice(0, max);
    }

    function cleanText(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    }

    function byteLengthOfBase64(value) {
        const clean = String(value || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
        if (!clean) return 0;
        const padding = clean.endsWith('==') ? 2 : (clean.endsWith('=') ? 1 : 0);
        return Math.max(0, Math.floor(clean.length * 3 / 4) - padding);
    }

    function serviceFactory() {
        const moduleValue = getAudioServiceModule();
        const factory = moduleValue && (
            moduleValue.createReadAloudAudioService || moduleValue.create
        );
        if (typeof factory !== 'function') {
            throw artifactAudioError(
                'audio-service-unavailable',
                'The shared read-aloud audio service is not loaded.'
            );
        }
        return factory;
    }

    function createIsolatedStore() {
        const moduleValue = getStoreModule();
        if (!moduleValue || typeof moduleValue.createStore !== 'function') {
            throw artifactAudioError(
                'audio-store-unavailable',
                'The shared V4 read-aloud audio store is not loaded.'
            );
        }
        return moduleValue.createStore();
    }

    function playableUrl(value) {
        if (typeof value === 'string' && value.trim()) return value;
        if (!value || typeof value !== 'object') return null;
        return value.url || value.audioUrl || value.objectUrl || null;
    }

    async function normalizeSynthesizedAudio(value, signal) {
        if (value && typeof value === 'object') {
            if (value.b64 || value.base64 || value.bytes || value.arrayBuffer || value.blob) return value;
            if (typeof Blob !== 'undefined' && value instanceof Blob) return value;
        }
        const url = playableUrl(value);
        if (!url) {
            throw artifactAudioError('tts-audio-missing', 'Text-to-speech did not return audio bytes or a playable URL.');
        }
        const response = await fetchAudio(url, signal ? { signal } : undefined);
        if (!response || response.ok === false || typeof response.blob !== 'function') {
            throw artifactAudioError(
                'tts-audio-fetch-failed',
                'The generated narration could not be copied into the artifact.',
                response && response.status
            );
        }
        return { blob: await response.blob() };
    }

    function normalizeSegments(input, defaults) {
        const seen = new Set();
        const list = Array.isArray(input) ? input : [];
        return list.map((raw, index) => {
            const text = cleanText(raw && (raw.text == null ? raw.spokenText : raw.text));
            if (!text) return null;
            const segmentId = cleanToken(raw && (raw.segmentId || raw.id), 'segment-' + (index + 1), 240);
            if (seen.has(segmentId)) {
                throw artifactAudioError('duplicate-segment-id', 'Artifact narration segment ids must be unique.', segmentId);
            }
            seen.add(segmentId);
            const voice = cleanToken(raw && raw.voice, defaults.voice, 160);
            const language = cleanToken(raw && raw.language, defaults.language, 100);
            const speedValue = Number(raw && (raw.synthesisRate == null ? raw.speed : raw.synthesisRate));
            const speed = Number.isFinite(speedValue) && speedValue > 0 && speedValue <= 4
                ? speedValue
                : defaults.speed;
            return {
                segmentId,
                text,
                voice,
                language,
                speed,
                provider: cleanToken(raw && raw.provider, defaults.provider, 80),
                directionFingerprint: cleanToken(raw && raw.directionFingerprint, '', 240),
                voiceResolverVersion: Number(raw && raw.voiceResolverVersion) > 0
                    ? Math.floor(Number(raw.voiceResolverVersion))
                    : defaults.voiceResolverVersion,
            };
        }).filter(Boolean);
    }

    async function prepare(options = {}) {
        if (options.ownerApproved !== true) {
            throw artifactAudioError(
                'owner-approval-required',
                'Narration is embedded only after the owner explicitly chooses to include it.'
            );
        }
        const requestedSpeed = Number(options.speed);
        const defaults = {
            // Kore is the product default. Never silently introduce a different
            // Gemini voice at the artifact boundary.
            voice: cleanToken(options.defaultVoice, 'Kore', 160),
            language: cleanToken(options.language, 'English', 100),
            speed: Number.isFinite(requestedSpeed) && requestedSpeed > 0 && requestedSpeed <= 4
                ? requestedSpeed
                : 1,
            provider: cleanToken(options.provider, 'tts-resolver', 80),
            voiceResolverVersion: Number(options.voiceResolverVersion) > 0
                ? Math.floor(Number(options.voiceResolverVersion))
                : 2,
        };
        const segments = normalizeSegments(options.segments, defaults);
        if (!segments.length) {
            return {
                audioBySegmentId: {},
                total: 0,
                prepared: 0,
                failed: 0,
                skipped: 0,
                estimatedBytes: 0,
                errors: [],
            };
        }

        const store = createIsolatedStore();
        const resourceId = cleanToken(options.resourceId, 'read-aloud-artifact', 240);
        const resourceType = cleanToken(options.resourceType, 'read-aloud-artifact', 160);
        const scopeId = cleanToken(options.scopeId, 'main', 240);
        const resource = { id: resourceId, type: resourceType, segments };
        const adapterId = cleanToken(options.adapterId, 'read-aloud-artifact', 160);
        const service = serviceFactory()({
            getStoreModule: () => store,
            getResource: () => resource,
            getSynthesisProfile: ({ segment }) => ({
                voice: segment.voice || defaults.voice,
                language: segment.language || defaults.language,
                provider: segment.provider || defaults.provider,
                speed: segment.speed || defaults.speed,
                synthesisRate: segment.speed || defaults.speed,
                directionFingerprint: segment.directionFingerprint || undefined,
                voiceResolverVersion: segment.voiceResolverVersion || defaults.voiceResolverVersion,
            }),
            synthesize: async ({ text, profile, signal }) => {
                const voice = cleanToken(profile && profile.voice, defaults.voice, 160);
                const language = cleanToken(profile && profile.language, defaults.language, 100);
                const speed = Number(profile && (profile.synthesisRate == null ? profile.speed : profile.synthesisRate)) || defaults.speed;
                const audio = await callTTS(text, voice, speed, {
                    maxRetries: Number(options.maxRetries) >= 0 ? Number(options.maxRetries) : 2,
                    language,
                    signal,
                });
                return normalizeSynthesizedAudio(audio, signal);
            },
        }).forResource({
            resourceId,
            resourceType,
            lane: store,
            persistencePolicy: 'none',
            adapter: {
                enumerate: (value) => value && value.segments,
                spokenText: (segment) => segment.text,
                fields: (segment) => ({
                    segmentId: segment.segmentId,
                    storageKey: {
                        identityVersion: 4,
                        adapterId,
                        adapterVersion: 1,
                        scopeId,
                        segmentId: segment.segmentId,
                        spokenText: segment.text,
                    },
                    voice: segment.voice,
                    language: segment.language,
                    provider: segment.provider,
                    speed: segment.speed,
                    synthesisRate: segment.speed,
                    directionFingerprint: segment.directionFingerprint || undefined,
                    voiceResolverVersion: segment.voiceResolverVersion,
                }),
            },
        });

        let preparation;
        try {
            preparation = await service.prepareAll({
                signal: options.signal,
                onProgress: options.onProgress,
            });
            const serialized = service.serialize() || {};
            const entries = serialized.entries && typeof serialized.entries === 'object'
                ? serialized.entries
                : {};
            const audioBySegmentId = {};
            Object.keys(entries).sort().forEach((key) => {
                const entry = entries[key];
                const identity = entry && entry.identity;
                const segmentId = identity && identity.segmentId;
                const base64 = entry && entry.audio;
                if (!segmentId || typeof base64 !== 'string' || !base64) return;
                const profile = entry.synthesisProfile || {};
                audioBySegmentId[segmentId] = {
                    encoding: 'base64',
                    mime: entry.mime || 'audio/mpeg',
                    base64: base64.replace(/^data:[^,]*,/, '').replace(/\s+/g, ''),
                    byteLength: byteLengthOfBase64(base64),
                    source: cleanToken(options.source, 'tts-artifact', 80),
                    vetted: true,
                    vettingMethod: 'owner-approved',
                    synthesisProfile: {
                        voice: cleanToken(profile.voice, defaults.voice, 160),
                        language: cleanToken(profile.language, defaults.language, 100),
                        provider: cleanToken(profile.provider, defaults.provider, 80),
                        synthesisRate: Number(profile.synthesisRate == null ? profile.speed : profile.synthesisRate) || defaults.speed,
                        voiceResolverVersion: Number(profile.voiceResolverVersion) > 0
                            ? Math.floor(Number(profile.voiceResolverVersion))
                            : defaults.voiceResolverVersion,
                    },
                };
            });
            const estimatedBytes = Object.values(audioBySegmentId)
                .reduce((sum, audio) => sum + (Number(audio.byteLength) || 0), 0);
            return {
                audioBySegmentId,
                total: preparation.total,
                prepared: preparation.prepared,
                failed: preparation.failed,
                skipped: preparation.skipped,
                estimatedBytes,
                errors: (preparation.errors || []).map((item) => ({
                    index: item.index,
                    segmentId: item.segmentId,
                    code: item.error && item.error.code ? item.error.code : 'narration-failed',
                    message: item.error && item.error.message ? item.error.message : 'Narration could not be generated.',
                })),
            };
        } finally {
            if (store && typeof store.clear === 'function') store.clear();
        }
    }

    return { prepare };
};

if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.ReadAloudArtifactAudio = {
        create: createReadAloudArtifactAudio,
    };
    window.AlloModules.createReadAloudArtifactAudio = createReadAloudArtifactAudio;
    window.AlloModules.ReadAloudArtifactAudioModule = true;
}
})();
