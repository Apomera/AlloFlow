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
    const getRequestedProfile = typeof dependencies.getRequestedProfile === 'function'
        ? dependencies.getRequestedProfile : () => ({});

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
            const requested = getRequestedProfile({ voice, language }) || {};
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
                requestedProvider: cleanToken(raw && raw.requestedProvider, defaults.requestedProvider || requested.requestedProvider || '', 240),
                requestedModel: cleanToken(raw && raw.requestedModel, defaults.requestedModel || requested.requestedModel || '', 240),
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
            // Requested routing and actual engine provenance differ on fallback.
            // An invented provider here would make a valid fallback look stale.
            provider: cleanToken(options.provider, '', 80),
            requestedProvider: cleanToken(options.requestedProvider, '', 240),
            requestedModel: cleanToken(options.requestedModel, '', 240),
            voiceResolverVersion: Number(options.voiceResolverVersion) > 0
                ? Math.floor(Number(options.voiceResolverVersion))
                : 2,
        };
        const segments = normalizeSegments(options.segments, defaults);
        if (!segments.length) {
            return {
                audioBySegmentId: {},
                checkpoint: null,
                cancelled: false,
                available: 0,
                remaining: 0,
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
        const checkpointFor = payload => ({ version: 1, resourceId, resourceType, scopeId, adapterId, payload });
        if (options.checkpoint) {
            const previous = options.checkpoint;
            if (previous.version !== 1 || previous.resourceId !== resourceId || previous.resourceType !== resourceType ||
                previous.scopeId !== scopeId || previous.adapterId !== adapterId || previous.payload?.version !== 4) {
                throw artifactAudioError('checkpoint-mismatch', 'This narration checkpoint belongs to a different artifact.');
            }
            // Checkpoints are an import boundary. Learner practice recordings
            // and legacy/unidentified takes must never become export narration.
            const entries = Object.fromEntries(Object.entries(previous.payload.entries || {}).filter(([, entry]) =>
                ['ai-generated', 'ai-played', 'ai', 'human-teacher'].includes(entry?.source) &&
                entry.identity?.adapterId === adapterId && entry.identity?.adapterVersion === 1 &&
                entry.identity?.scopeId === scopeId && segments.some(segment => segment.segmentId === entry.identity?.segmentId)));
            store.hydrate({ version: 4, entries });
        }
        const service = serviceFactory()({
            getStoreModule: () => store,
            getResource: () => resource,
            persist: async ({ payload }) => {
                if (typeof options.onCheckpoint === 'function') return options.onCheckpoint(checkpointFor(payload));
            },
            getSynthesisProfile: ({ segment }) => ({
                voice: segment.voice || defaults.voice,
                language: segment.language || defaults.language,
                provider: segment.provider || defaults.provider,
                requestedProvider: segment.requestedProvider || undefined,
                requestedModel: segment.requestedModel || undefined,
                speed: segment.speed || defaults.speed,
                synthesisRate: segment.speed || defaults.speed,
                directionFingerprint: segment.directionFingerprint || undefined,
                voiceResolverVersion: segment.voiceResolverVersion || defaults.voiceResolverVersion,
            }),
            synthesize: async ({ text, profile, signal }) => {
                const voice = cleanToken(profile && profile.voice, defaults.voice, 160);
                const language = cleanToken(profile && profile.language, defaults.language, 100);
                const speed = Number(profile && (profile.synthesisRate == null ? profile.speed : profile.synthesisRate)) || defaults.speed;
                let resolvedProfile = {};
                const audio = await callTTS(text, voice, speed, {
                    maxRetries: Number(options.maxRetries) >= 0 ? Number(options.maxRetries) : 2,
                    language,
                    signal,
                    onResolvedProfile: value => { resolvedProfile = value || {}; },
                });
                const normalized = await normalizeSynthesizedAudio(audio, signal);
                const encoded = typeof Blob !== 'undefined' && normalized instanceof Blob ? { blob: normalized } : normalized;
                return { ...encoded, provenance: { ...(encoded.provenance || {}), ...resolvedProfile } };
            },
        }).forResource({
            resourceId,
            resourceType,
            lane: store,
            persistencePolicy: typeof options.onCheckpoint === 'function' ? 'durable' : 'none',
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
                    requestedProvider: segment.requestedProvider,
                    requestedModel: segment.requestedModel,
                    speed: segment.speed,
                    synthesisRate: segment.speed,
                    directionFingerprint: segment.directionFingerprint || undefined,
                    voiceResolverVersion: segment.voiceResolverVersion,
                }),
            },
        });

        let preparation;
        let latestProgress = { total: segments.length, prepared: 0, skipped: 0, failed: 0 };
        try {
            let cancellation = null;
            try {
                preparation = await service.prepareAll({
                    signal: options.signal,
                    onProgress: progress => {
                        latestProgress = progress;
                        if (typeof options.onProgress === 'function') options.onProgress(progress);
                    },
                });
            } catch (error) {
                if (error?.name !== 'AbortError') throw error;
                cancellation = error;
                preparation = { ...latestProgress, errors: [] };
            }
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
                if (!segments.some(segment => segment.segmentId === segmentId) || service.inspect(segmentId).status !== 'ready') return;
                const profile = entry.synthesisProfile || {};
                audioBySegmentId[segmentId] = {
                    encoding: 'base64',
                    mime: entry.mime || 'audio/mpeg',
                    base64: base64.replace(/^data:[^,]*,/, '').replace(/\s+/g, ''),
                    byteLength: byteLengthOfBase64(base64),
                    source: entry.source === 'human-teacher' ? entry.source : cleanToken(options.source, 'tts-artifact', 80),
                    vetted: true,
                    vettingMethod: 'owner-approved',
                    synthesisProfile: {
                        voice: cleanToken(profile.voice, defaults.voice, 160),
                        language: cleanToken(profile.language, defaults.language, 100),
                        provider: cleanToken(profile.provider, defaults.provider || 'tts-resolver', 80),
                        synthesisRate: Number(profile.synthesisRate == null ? profile.speed : profile.synthesisRate) || defaults.speed,
                        voiceResolverVersion: Number(profile.voiceResolverVersion) > 0
                            ? Math.floor(Number(profile.voiceResolverVersion))
                            : defaults.voiceResolverVersion,
                    },
                };
            });
            const estimatedBytes = Object.values(audioBySegmentId)
                .reduce((sum, audio) => sum + (Number(audio.byteLength) || 0), 0);
            const result = {
                audioBySegmentId,
                checkpoint: checkpointFor(serialized),
                cancelled: !!cancellation,
                available: Object.keys(audioBySegmentId).length,
                remaining: Math.max(0, preparation.total - Object.keys(audioBySegmentId).length),
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
            if (cancellation) {
                cancellation.partialResult = result;
                cancellation.checkpoint = result.checkpoint;
                throw cancellation;
            }
            return result;
        } finally {
            if (store && typeof store.clear === 'function') store.clear();
        }
    }

    return { prepare };
};

// Owner-requested export recovery. Callers keep this object for their lifetime;
// each call supplies current dependencies, avoiding stale host/profile closures.
const createReadAloudArtifactRecovery = () => {
    const checkpoints = new Map();
    const texts = new Map();
    const jobs = new Set();
    const errorCode = error => typeof error?.code === 'string' ? error.code : error?.name || 'checkpoint-storage-failed';
    const identityKey = options => {
        if (options.ownerApproved !== true) throw Object.assign(new Error('Choose to include narration before preparing it.'), { code: 'owner-approval-required' });
        const identity = [options.resourceId, options.resourceType, options.adapterId, options.scopeId];
        if (identity.some(value => typeof value !== 'string' || !value.trim())) throw Object.assign(new Error('Export recovery requires a stable artifact identity.'), { code: 'checkpoint-identity-required' });
        return encodeURIComponent(JSON.stringify(identity));
    };
    // Exact input matching avoids a new epilogue changing already accepted audio
    // on retry. Keep this separate from media so a quota failure cannot lose text.
    async function prepareText(options, dependencies) {
        const identity = identityKey(options);
        if (typeof options.input !== 'string' || !options.input) throw Object.assign(new Error('Export text requires its current input.'), { code: 'checkpoint-input-required' });
        const key = 'allo_read_aloud_checkpoint_text:' + identity;
        const checkCancelled = () => {
            if (options.signal?.aborted) throw Object.assign(new Error('Storybook preparation cancelled.'), { name: 'AbortError' });
        };
        checkCancelled();
        if (jobs.has(key)) throw Object.assign(new Error('Storybook text is already being prepared.'), { code: 'preparation-in-progress' });
        jobs.add(key);
        const matches = value => value?.version === 1 && value.identity === identity && value.input === options.input &&
            typeof value.text === 'string' && !!value.text.trim();
        let recovery = { state: 'session-only', verifiedAt: null, code: null, resumed: false };
        try {
            let stored;
            try { stored = await dependencies.storage.get(key, { throwOnError: true, localOnly: true }); }
            catch (error) { recovery.code = errorCode(error); }
            checkCancelled();
            let value = texts.get(key);
            if (!matches(value)) value = matches(stored) ? stored : null;
            recovery.resumed = !!value;
            if (!value) {
                const generated = await dependencies.generate();
                checkCancelled();
                if (typeof generated !== 'string' || !generated.trim()) throw Object.assign(new Error('No Storybook epilogue was returned.'), { code: 'export-text-empty' });
                value = { version: 1, identity, input: options.input, text: generated.trim() };
            }
            texts.set(key, value);
            if (matches(stored) && stored.text === value.text) {
                recovery = { ...recovery, state: 'saved', verifiedAt: new Date().toISOString(), code: null };
            } else {
                try {
                    const receipt = await dependencies.writeVerifiedStorageSnapshot(dependencies.storage, key, value, () => !options.signal?.aborted);
                    if (receipt?.verified !== true) throw Object.assign(new Error('Epilogue save was not verified.'), { code: 'checkpoint-unverified' });
                    recovery = { ...recovery, state: 'saved', verifiedAt: receipt.verifiedAt, code: null };
                } catch (error) { recovery.code = errorCode(error); }
            }
            checkCancelled();
            return { text: value.text, recovery };
        } finally { jobs.delete(key); }
    }
    async function prepare(options, dependencies) {
        const key = 'allo_read_aloud_checkpoint:' + identityKey(options);
        if (jobs.has(key)) throw Object.assign(new Error('Narration for this export is already being prepared.'), { code: 'preparation-in-progress' });
        jobs.add(key);
        let recovery = { state: 'session-only', verifiedAt: null, code: null, resumed: false };
        let checkpoint = options.checkpoint || checkpoints.get(key) || null;
        const save = async value => {
            checkpoints.set(key, value);
            try {
                const receipt = await dependencies.writeVerifiedStorageSnapshot(dependencies.storage, key, value);
                if (receipt?.verified !== true) throw Object.assign(new Error('Checkpoint save was not verified.'), { code: 'checkpoint-unverified' });
                recovery = { ...recovery, state: 'saved', verifiedAt: receipt.verifiedAt, code: null };
            } catch (error) {
                recovery = { ...recovery, state: 'session-only', verifiedAt: null, code: errorCode(error) };
            }
            if (typeof options.onCheckpoint === 'function') await options.onCheckpoint(value);
            return { status: recovery.state === 'saved' ? 'saved' : 'attached', verified: recovery.state === 'saved' };
        };
        try {
            if (!checkpoint) {
                try { checkpoint = await dependencies.storage.get(key, { throwOnError: true, localOnly: true }); }
                catch (error) { recovery.code = errorCode(error); }
            }
            if (checkpoint && (checkpoint.version !== 1 || checkpoint.payload?.version !== 4 ||
                ['resourceId', 'resourceType', 'adapterId', 'scopeId'].some(field => checkpoint[field] !== options[field]))) {
                checkpoint = null;
                checkpoints.delete(key);
                recovery.code = 'checkpoint-invalid';
            }
            recovery.resumed = !!checkpoint;
            const result = await dependencies.prepare({ ...options, checkpoint, onCheckpoint: save });
            if (result.checkpoint) await save(result.checkpoint);
            return { ...result, recovery };
        } catch (error) {
            if (error.checkpoint) checkpoints.set(key, error.checkpoint);
            if (error.partialResult) error.partialResult.recovery = recovery;
            error.recovery = recovery;
            throw error;
        } finally { jobs.delete(key); }
    }
    return { prepare, prepareText };
};

if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.ReadAloudArtifactAudio = {
        create: createReadAloudArtifactAudio,
        createRecovery: createReadAloudArtifactRecovery,
    };
    window.AlloModules.createReadAloudArtifactAudio = createReadAloudArtifactAudio;
    window.AlloModules.ReadAloudArtifactAudioModule = true;
}
