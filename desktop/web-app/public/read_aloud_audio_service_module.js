(function(){"use strict";
if(window.AlloModules&&window.AlloModules.ReadAloudAudioServiceModule){console.log("[CDN] ReadAloudAudioServiceModule already loaded, skipping"); return;}
// read_aloud_audio_service_source.jsx
//
// Resource-agnostic orchestration for durable read-aloud audio. The factory
// intentionally receives live getters instead of capturing other AlloModules
// at script-load time. Resource-specific text, identity, and metadata belong
// to an adapter; storage, synthesis, encoding, persistence, and events are
// injected so this module stays usable in the browser and in Node/jsdom tests.

const createReadAloudAudioService = (dependencies = {}) => {
    const getStoreModule = typeof dependencies.getStoreModule === 'function'
        ? dependencies.getStoreModule
        : () => null;
    const getResource = typeof dependencies.getResource === 'function'
        ? dependencies.getResource
        : () => null;
    const getSynthesisProfile = typeof dependencies.getSynthesisProfile === 'function'
        ? dependencies.getSynthesisProfile
        : () => ({});
    const synthesize = typeof dependencies.synthesize === 'function'
        ? dependencies.synthesize
        : async () => { throw serviceError('synthesize-unavailable', 'No read-aloud synthesizer was provided.'); };
    const encode = typeof dependencies.encode === 'function'
        ? dependencies.encode
        : defaultEncode;
    const normalize = typeof dependencies.normalize === 'function'
        ? dependencies.normalize
        : (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    const persist = typeof dependencies.persist === 'function' ? dependencies.persist : null;
    const events = dependencies.events || null;
    const fallbackStores = typeof WeakMap === 'function' ? new WeakMap() : new Map();

    function serviceError(code, message, detail) {
        const error = new Error(message);
        error.code = code;
        if (detail !== undefined) error.detail = detail;
        return error;
    }

    function abortError(signal) {
        const reason = signal && signal.reason;
        if (reason && reason.name === 'AbortError') return reason;
        const error = new Error(reason && reason.message ? reason.message : 'Read-aloud preparation was cancelled.');
        error.name = 'AbortError';
        error.code = 'aborted';
        return error;
    }

    function throwIfAborted(signal) {
        if (signal && signal.aborted) throw abortError(signal);
    }

    function isStore(value) {
        return !!value && typeof value === 'object' && (
            typeof value.get === 'function' ||
            typeof value.has === 'function' ||
            typeof value.put === 'function' ||
            typeof value.putEntry === 'function'
        );
    }

    function bytesToBase64(input) {
        const bytes = input instanceof Uint8Array
            ? input
            : new Uint8Array(input.buffer || input, input.byteOffset || 0, input.byteLength || undefined);
        let binary = '';
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
            const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
            binary += String.fromCharCode.apply(null, chunk);
        }
        if (typeof btoa !== 'function') {
            throw serviceError('base64-unavailable', 'This environment cannot encode read-aloud audio as base64.');
        }
        return btoa(binary);
    }

    async function defaultEncode(audio) {
        let value = audio;
        if (value && typeof value === 'object' && value.encoded != null) value = value.encoded;
        if (value && typeof value === 'object' && value.audio != null && !value.b64 && !value.base64 && !value.bytes && !value.blob) {
            value = value.audio;
        }
        if (typeof value === 'string' && /^data:[^,]*;base64,/i.test(value)) {
            const comma = value.indexOf(',');
            const header = value.slice(0, comma);
            const mimeMatch = header.match(/^data:([^;,]+)/i);
            return { b64: value.slice(comma + 1), mime: mimeMatch ? mimeMatch[1] : 'audio/mpeg' };
        }
        if (value && typeof value === 'object') {
            const b64 = value.b64 || value.base64 || value.data;
            if (typeof b64 === 'string' && b64.trim()) {
                return {
                    b64: b64.replace(/^data:[^,]*,/, '').replace(/\s+/g, ''),
                    mime: value.mime || value.type || 'audio/mpeg',
                };
            }
            const bytes = value.bytes || value.arrayBuffer;
            if (bytes instanceof ArrayBuffer || ArrayBuffer.isView(bytes)) {
                return { b64: bytesToBase64(bytes), mime: value.mime || value.type || 'audio/mpeg' };
            }
            if (value.blob && typeof value.blob.arrayBuffer === 'function') {
                const buffer = await value.blob.arrayBuffer();
                return { b64: bytesToBase64(buffer), mime: value.mime || value.blob.type || 'audio/mpeg' };
            }
            if (typeof Blob !== 'undefined' && value instanceof Blob && typeof value.arrayBuffer === 'function') {
                const buffer = await value.arrayBuffer();
                return { b64: bytesToBase64(buffer), mime: value.type || 'audio/mpeg' };
            }
        }
        throw serviceError(
            'encode-unavailable',
            'Read-aloud audio must include base64/bytes/blob data, or the service must receive an encode dependency.'
        );
    }

    function audioUrlOf(audio) {
        if (typeof audio === 'string' && !/^data:/i.test(audio)) return audio;
        if (!audio || typeof audio !== 'object') return null;
        return audio.url || audio.audioUrl || audio.objectUrl || null;
    }

    function audioProvenanceOf(audio) {
        if (!audio || typeof audio !== 'object') return {};
        const provenance = audio.provenance && typeof audio.provenance === 'object'
            ? audio.provenance
            : {};
        const out = {};
        ['provider', 'engine', 'engineVersion', 'model', 'modelVersion'].forEach((key) => {
            const value = audio[key] != null ? audio[key] : provenance[key];
            if (value != null && String(value).trim()) out[key] = value;
        });
        return out;
    }

    function forResource(configuration = {}) {
        const resourceId = configuration.resourceId == null ? '' : String(configuration.resourceId);
        const resourceType = configuration.resourceType == null ? '' : String(configuration.resourceType);
        const adapter = configuration.adapter;
        const lane = configuration.lane == null ? 'current' : configuration.lane;
        const persistencePolicy = configuration.persistencePolicy == null ? 'none' : configuration.persistencePolicy;
        const subscribers = new Set();
        const bindingKey = resourceType + ':' + resourceId + ':' + (typeof lane === 'string' ? lane : 'custom');

        if (!adapter || typeof adapter.enumerate !== 'function' || typeof adapter.spokenText !== 'function') {
            throw serviceError(
                'invalid-adapter',
                'A read-aloud adapter must provide enumerate(resource, context) and spokenText(segment, context).'
            );
        }
        if (adapter.fields != null && typeof adapter.fields !== 'function') {
            throw serviceError('invalid-adapter', 'adapter.fields must be a function when provided.');
        }

        function context(extra) {
            return Object.assign({
                resourceId,
                resourceType,
                adapter,
                lane,
                persistencePolicy,
            }, extra || {});
        }

        function liveResource(extra) {
            return getResource(context(extra));
        }

        function liveStore(extra) {
            const ctx = context(extra);
            const moduleValue = getStoreModule(ctx);
            if (!moduleValue) return null;
            if (isStore(moduleValue)) return moduleValue;

            let store = null;
            if (typeof lane === 'function') {
                store = lane(moduleValue, ctx);
            } else if (isStore(lane)) {
                store = lane;
            } else if (typeof moduleValue.getStore === 'function') {
                store = moduleValue.getStore(ctx);
            }
            if (!store && typeof lane === 'string') store = moduleValue[lane];
            if (isStore(store)) return store;

            // Legacy KaraokeAudioStore exposes createStore() plus nullable
            // current/studentCurrent lanes. Keep a private per-module fallback
            // until the host supplies the active lane; never mutate the module.
            if (typeof moduleValue.createStore === 'function') {
                let stores = fallbackStores.get(moduleValue);
                if (!stores) {
                    stores = new Map();
                    fallbackStores.set(moduleValue, stores);
                }
                if (!stores.has(bindingKey)) stores.set(bindingKey, moduleValue.createStore());
                return stores.get(bindingKey);
            }
            return null;
        }

        function emit(type, detail) {
            const event = Object.assign({
                type,
                resourceId,
                resourceType,
                lane: typeof lane === 'string' ? lane : 'custom',
                timestamp: new Date().toISOString(),
            }, detail || {});
            subscribers.forEach((listener) => {
                try { listener(event); } catch (_) {}
            });
            try {
                if (typeof events === 'function') events(event);
                else if (events && typeof events.emit === 'function') events.emit(event);
            } catch (_) {}
            return event;
        }

        function segments() {
            const resource = liveResource({ operation: 'segments' });
            const baseContext = context({ resource, operation: 'segments' });
            const rawSegments = adapter.enumerate(resource, baseContext);
            if (!Array.isArray(rawSegments)) return [];
            return rawSegments.map((raw, index) => {
                const segmentContext = context({ resource, raw, index, operation: 'segments' });
                const suppliedFields = adapter.fields ? (adapter.fields(raw, segmentContext) || {}) : {};
                const fields = suppliedFields && typeof suppliedFields === 'object'
                    ? Object.assign({}, suppliedFields)
                    : {};
                const spoken = normalize(adapter.spokenText(raw, segmentContext), segmentContext);
                const rawId = raw && typeof raw === 'object' ? raw.id : null;
                const segmentId = fields.segmentId != null
                    ? String(fields.segmentId)
                    : (fields.id != null ? String(fields.id) : (rawId != null ? String(rawId) : String(index)));
                const storageKey = fields.storageKey != null
                    ? fields.storageKey
                    : (fields.storeKey != null ? fields.storeKey : spoken);
                return Object.assign({}, fields, {
                    id: segmentId,
                    segmentId,
                    index,
                    resourceId,
                    resourceType,
                    lane: typeof lane === 'string' ? lane : 'custom',
                    spokenText: String(spoken == null ? '' : spoken),
                    storageKey,
                    fields,
                    raw,
                });
            }).filter((segment) => segment.spokenText.length > 0);
        }

        function requireSegment(input) {
            const list = segments();
            let found = null;
            if (typeof input === 'number' && Number.isInteger(input)) found = list[input] || null;
            if (!found && typeof input === 'string') {
                found = list.find((segment) => (
                    segment.segmentId === input ||
                    String(segment.storageKey) === input ||
                    segment.spokenText === input
                )) || null;
            }
            if (!found && input && typeof input === 'object') {
                if (input.resourceId === resourceId && input.resourceType === resourceType && input.segmentId != null) {
                    found = list.find((segment) => segment.segmentId === String(input.segmentId)) || null;
                }
                if (!found) found = list.find((segment) => segment.raw === input) || null;
            }
            if (!found) {
                throw serviceError('segment-not-found', 'The requested read-aloud segment does not exist in the live resource.', input);
            }
            return found;
        }

        function profileFor(segment, operation) {
            const resource = liveResource({ segment, operation });
            const base = getSynthesisProfile(context({ resource, segment, operation })) || {};
            const profile = Object.assign({}, base);
            const overrides = segment && segment.fields && (
                segment.fields.synthesisProfile || segment.fields.profile
            );
            if (overrides && typeof overrides === 'object') Object.assign(profile, overrides);
            ['voice', 'language', 'provider', 'engine', 'engineVersion', 'model', 'modelVersion',
                'speed', 'synthesisRate', 'directionFingerprint', 'voiceResolverVersion'].forEach((key) => {
                if (segment && segment.fields && segment.fields[key] != null) profile[key] = segment.fields[key];
            });
            if (profile.synthesisRate == null && profile.speed != null) profile.synthesisRate = profile.speed;
            if (profile.speed == null && profile.synthesisRate != null) profile.speed = profile.synthesisRate;
            return profile;
        }

        function compatibilityFor(profile) {
            return {
                voice: profile.voice,
                language: profile.language,
                speed: profile.synthesisRate == null ? profile.speed : profile.synthesisRate,
                provider: profile.provider,
                engine: profile.engine,
                engineVersion: profile.engineVersion,
                model: profile.model,
                modelVersion: profile.modelVersion,
                directionFingerprint: profile.directionFingerprint,
                voiceResolverVersion: profile.voiceResolverVersion,
            };
        }

        function metadataFor(profile, extra) {
            return Object.assign({
                voice: profile.voice,
                language: profile.language,
                speed: profile.synthesisRate == null ? profile.speed : profile.synthesisRate,
                synthesisRate: profile.synthesisRate == null ? profile.speed : profile.synthesisRate,
                provider: profile.provider,
                engine: profile.engine,
                engineVersion: profile.engineVersion,
                model: profile.model,
                modelVersion: profile.modelVersion,
                directionFingerprint: profile.directionFingerprint,
                voiceResolverVersion: profile.voiceResolverVersion == null ? 2 : profile.voiceResolverVersion,
                createdAt: new Date().toISOString(),
            }, extra || {});
        }

        function inspectDescriptor(segment, store, profile) {
            if (!store) {
                return { status: 'missing', url: null, storedUrl: null, source: null, metadata: null, segment, profile };
            }
            const key = segment.storageKey;
            const compatibility = compatibilityFor(profile);
            let storedUrl = null;
            try {
                if (typeof store.get === 'function') storedUrl = store.get(key);
            } catch (_) {}
            // V4 stores own identity compatibility (including the important
            // "same stable segment, edited spoken text" stale case). Prefer
            // their structured result instead of reconstructing state from
            // has()/getCompatible(), which cannot distinguish that edit from
            // a truly missing identity.
            if (typeof store.inspect === 'function') {
                const inspected = store.inspect(key, compatibility);
                if (inspected && typeof inspected === 'object') {
                    const status = ['ready', 'stale', 'missing', 'corrupt'].includes(inspected.status)
                        ? inspected.status
                        : (inspected.url != null ? 'ready' : 'missing');
                    return {
                        status,
                        url: status === 'ready' && inspected.url != null ? inspected.url : null,
                        storedUrl: storedUrl != null ? storedUrl : (inspected.url != null ? inspected.url : null),
                        source: inspected.source == null ? null : inspected.source,
                        metadata: inspected.metadata || inspected.synthesisProfile || null,
                        identity: inspected.identity || null,
                        synthesisProfile: inspected.synthesisProfile || null,
                        legacy: inspected.legacy === true,
                        quarantine: inspected.quarantine || null,
                        segment,
                        profile,
                    };
                }
            }
            let url = null;
            let exists = false;
            let source = null;
            let metadata = null;
            if (typeof store.sourceOf === 'function') source = store.sourceOf(key);
            if (typeof store.metadataOf === 'function') metadata = store.metadataOf(key);
            if (typeof store.has === 'function') exists = !!store.has(key);
            if (typeof store.getCompatible === 'function') {
                url = store.getCompatible(key, compatibility);
            } else if (typeof store.get === 'function') {
                url = store.get(key);
            }
            if (!exists && (url != null || storedUrl != null)) exists = true;
            return {
                status: url != null ? 'ready' : (exists ? 'stale' : 'missing'),
                url: url == null ? null : url,
                storedUrl: storedUrl == null ? null : storedUrl,
                source,
                metadata,
                segment,
                profile,
            };
        }

        function inspect(input, options = {}) {
            const segment = requireSegment(input);
            const store = liveStore({ segment, operation: 'inspect' });
            const profile = Object.assign({}, profileFor(segment, 'inspect'), options.profile || {});
            return inspectDescriptor(segment, store, profile);
        }

        function summary() {
            const list = segments();
            const store = liveStore({ operation: 'summary' });
            const result = { total: list.length, ready: 0, stale: 0, corrupt: 0, missing: 0, estimatedBytes: 0 };
            list.forEach((segment) => {
                const status = inspectDescriptor(segment, store, profileFor(segment, 'summary')).status;
                result[status] += 1;
            });
            if (store && typeof store.estimateBytes === 'function') {
                const bytes = Number(store.estimateBytes());
                if (Number.isFinite(bytes) && bytes >= 0) result.estimatedBytes = bytes;
            }
            return result;
        }

        async function resolve(input, options = {}) {
            const segment = requireSegment(input);
            const store = liveStore({ segment, operation: 'resolve' });
            const profile = Object.assign({}, profileFor(segment, 'resolve'), options.profile || {});
            const inspected = inspectDescriptor(segment, store, profile);
            if (!options.force && inspected.status === 'ready' && inspected.url != null) {
                emit('resolved', { source: 'store', segment, profile, url: inspected.url });
                return inspected.url;
            }
            throwIfAborted(options.signal);
            const resource = liveResource({ segment, operation: 'resolve' });
            const audio = await synthesize({
                text: segment.spokenText,
                segment,
                profile,
                resource,
                resourceId,
                resourceType,
                lane,
                operation: 'resolve',
                signal: options.signal,
                reason: options.reason || 'resolve',
                priority: options.priority,
                maxRetries: options.maxRetries,
            });
            Object.assign(profile, audioProvenanceOf(audio));
            throwIfAborted(options.signal);
            const url = audioUrlOf(audio);
            if (!url) {
                throw serviceError('synthesis-url-missing', 'The read-aloud synthesizer did not return a playable URL.', audio);
            }
            emit('resolved', { source: 'synthesis', segment, profile, url });
            return url;
        }

        function shouldPersist(reason, segment) {
            const policyContext = context({ reason, segment, operation: 'persist-policy' });
            if (typeof persistencePolicy === 'function') return !!persistencePolicy(policyContext);
            if (persistencePolicy && typeof persistencePolicy === 'object') {
                if (typeof persistencePolicy.shouldPersist === 'function') {
                    return !!persistencePolicy.shouldPersist(policyContext);
                }
                return persistencePolicy.persist === true;
            }
            return ['embedded', 'resource', 'durable', 'always'].includes(String(persistencePolicy).toLowerCase());
        }

        function serializeStore(store) {
            return store && typeof store.serialize === 'function' ? store.serialize() : null;
        }

        async function persistStore(reason, segment, store, signal) {
            if (!persist || !shouldPersist(reason, segment)) return false;
            throwIfAborted(signal);
            const resource = liveResource({ segment, operation: 'persist', reason });
            const payload = serializeStore(store);
            await persist({
                resource,
                resourceId,
                resourceType,
                lane,
                adapter,
                persistencePolicy,
                reason,
                segment,
                payload,
                signal,
            });
            emit('persisted', { reason, segment, payload });
            return true;
        }

        async function storeAudio(input, audio, options) {
            const segment = requireSegment(input);
            const operation = options.operation;
            const signal = options.signal;
            throwIfAborted(signal);
            const profile = Object.assign({}, profileFor(segment, operation), options.profile || {},
                audioProvenanceOf(audio));
            const encoded = await encode(audio, {
                segment,
                profile,
                resource: liveResource({ segment, operation }),
                resourceId,
                resourceType,
                lane,
                signal,
                source: options.source,
                operation,
            });
            throwIfAborted(signal);
            if (!encoded || typeof encoded.b64 !== 'string' || !encoded.b64.trim()) {
                throw serviceError('invalid-encoded-audio', 'The read-aloud encoder did not return base64 audio data.', encoded);
            }
            const store = liveStore({ segment, operation });
            Object.assign(profile, audioProvenanceOf(encoded));
            if (!store) throw serviceError('store-unavailable', 'No read-aloud audio store is available for this resource.');
            const metadata = Object.assign(metadataFor(profile, options.metadata), audioProvenanceOf(profile));
            const entry = {
                key: segment.storageKey,
                b64: encoded.b64,
                mime: encoded.mime || 'audio/mpeg',
                source: options.source,
                metadata,
                options: options.storeOptions,
                segment,
            };
            let storedUrl;
            if (typeof store.putEntry === 'function') {
                storedUrl = store.putEntry(entry);
            } else if (typeof store.put === 'function') {
                // Positional call is the legacy KaraokeAudioStore contract.
                storedUrl = store.put(entry.key, entry.b64, entry.mime, entry.source, entry.metadata, entry.options);
            } else {
                throw serviceError('store-read-only', 'The read-aloud audio store cannot save clips.');
            }
            if (storedUrl == null) {
                const detail = typeof store.lastPutError === 'function' ? store.lastPutError() : null;
                throw serviceError('store-put-failed', 'The read-aloud audio store rejected this clip.', detail);
            }
            await persistStore(operation, segment, store, signal);
            emit('stored', { operation, segment, profile, source: entry.source, url: storedUrl, metadata });
            return storedUrl || audioUrlOf(audio);
        }

        async function capturePlayed(input, audio, options = {}) {
            return storeAudio(input, audio, {
                operation: 'capture-played',
                source: options.source || 'ai-played',
                profile: options.profile,
                metadata: options.metadata,
                storeOptions: options.storeOptions,
                signal: options.signal,
            });
        }

        async function saveRecording(input, recording, options = {}) {
            return storeAudio(input, recording, {
                operation: 'save-recording',
                source: options.source || 'human-teacher',
                profile: options.profile,
                metadata: options.metadata,
                storeOptions: options.storeOptions,
                signal: options.signal,
            });
        }

        async function regenerate(input, options = {}) {
            const segment = requireSegment(input);
            const profile = Object.assign({}, profileFor(segment, 'regenerate'), options.profile || {});
            throwIfAborted(options.signal);
            emit('regenerating', { segment, profile });
            const resource = liveResource({ segment, operation: 'regenerate' });
            const audio = await synthesize({
                text: segment.spokenText,
                segment,
                profile,
                resource,
                resourceId,
                resourceType,
                lane,
                operation: 'regenerate',
                signal: options.signal,
                reason: options.reason || 'regenerate',
                priority: options.priority,
                maxRetries: options.maxRetries,
            });
            throwIfAborted(options.signal);
            return storeAudio(segment, audio, {
                operation: 'regenerate',
                source: options.source || 'ai-generated',
                profile,
                metadata: options.metadata,
                storeOptions: options.storeOptions,
                signal: options.signal,
            });
        }

        async function prepareAll(options = {}) {
            const signal = options.signal;
            const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
            const list = segments();
            const result = { total: list.length, prepared: 0, skipped: 0, failed: 0, errors: [] };

            function progress(phase, detail) {
                const event = Object.assign({
                    phase,
                    total: result.total,
                    completed: result.prepared + result.skipped + result.failed,
                    prepared: result.prepared,
                    skipped: result.skipped,
                    failed: result.failed,
                }, detail || {});
                if (onProgress) {
                    try { onProgress(event); } catch (_) {}
                }
                emit('progress', event);
            }

            throwIfAborted(signal);
            progress('start');
            result.reconciliation = await reconcile({ signal, reason: 'prepare-reconcile' });
            for (let index = 0; index < list.length; index += 1) {
                throwIfAborted(signal);
                const segment = list[index];
                const state = inspect(segment);
                if (state.status === 'ready') {
                    result.skipped += 1;
                    progress('segment', { index, segment, status: 'skipped' });
                    continue;
                }
                try {
                    await regenerate(segment, {
                        signal,
                        reason: 'prepare-all',
                        profile: options.profile,
                        source: options.source,
                        metadata: options.metadata,
                        storeOptions: options.storeOptions,
                        priority: options.priority,
                        maxRetries: options.maxRetries,
                    });
                    result.prepared += 1;
                    progress('segment', { index, segment, status: 'prepared', previousStatus: state.status });
                } catch (error) {
                    if ((signal && signal.aborted) || (error && error.name === 'AbortError')) {
                        progress('aborted', { index, segment, status: 'aborted' });
                        throw abortError(signal);
                    }
                    result.failed += 1;
                    result.errors.push({ index, segmentId: segment.segmentId, error });
                    progress('segment', { index, segment, status: 'failed', error });
                    emit('error', { operation: 'prepare-all', segment, error });
                }
            }
            result.summary = summary();
            progress('complete', { summary: result.summary });
            return result;
        }


        async function reconcile(options = {}) {
            const signal = options.signal;
            throwIfAborted(signal);
            const store = liveStore({ operation: 'reconcile' });
            if (!store || typeof store.reconcile !== 'function') return null;
            const activeKeys = segments().map((segment) => segment.storageKey);
            const report = await Promise.resolve(store.reconcile(activeKeys, {
                pruneAi: options.pruneAi !== false,
            }));
            if (report && report.changed && options.persist !== false) {
                await persistStore(options.reason || 'reconcile', null, store, signal);
            }
            emit('reconciled', { report });
            return report;
        }

        async function quarantine(input, detail, options = {}) {
            const segment = requireSegment(input);
            const signal = options.signal;
            throwIfAborted(signal);
            const store = liveStore({ segment, operation: 'quarantine' });
            if (!store) return false;
            const quarantineEntry = typeof store.quarantine === 'function'
                ? store.quarantine.bind(store)
                : (typeof store.markCorrupt === 'function' ? store.markCorrupt.bind(store) : null);
            if (!quarantineEntry) return false;
            const changed = !!(await Promise.resolve(quarantineEntry(segment.storageKey, detail)));
            if (!changed) return false;
            await persistStore(options.reason || 'quarantine', segment, store, signal);
            emit('quarantined', { segment, quarantine: detail || null });
            return true;
        }
        async function remove(input, options = {}) {
            const segment = requireSegment(input);
            throwIfAborted(options.signal);
            const store = liveStore({ segment, operation: 'remove' });
            if (!store || typeof store.remove !== 'function') return false;
            const existed = typeof store.has === 'function' ? !!store.has(segment.storageKey) : true;
            store.remove(segment.storageKey);
            await persistStore('remove', segment, store, options.signal);
            emit('removed', { segment, existed });
            return existed;
        }

        function subscribe(listener) {
            if (typeof listener !== 'function') {
                throw serviceError('invalid-listener', 'Read-aloud subscribers must be functions.');
            }
            subscribers.add(listener);
            return () => subscribers.delete(listener);
        }

        function serialize() {
            return serializeStore(liveStore({ operation: 'serialize' }));
        }

        return {
            segments,
            inspect,
            summary,
            resolve,
            prepareAll,
            regenerate,
            capturePlayed,
            saveRecording,
            reconcile,
            quarantine,
            remove,
            subscribe,
            serialize,
        };
    }

    return { forResource };
};

// Resolution→capture provenance (2026-07-19). Hosts recreate the legacy
// bridge for every global call, so this registry lives at module scope. It
// maps a resolved playback URL to the exact synthesis profile and segment
// identity that produced it; capturePlayed prefers it over the live profile,
// so a voice change while generation/startup is pending can never persist
// one voice's audio under another voice's metadata. Bounded FIFO: an evicted
// entry only means capture falls back to the live profile — never a wrong
// match, because cached URLs are keyed by text+voice+speed+language.
const READ_ALOUD_PROVENANCE_LIMIT = 64;
const readAloudUrlProvenance = new Map();
const recordReadAloudProvenance = (url, provenance) => {
    if (!url || typeof url !== 'string' || !provenance) return;
    if (readAloudUrlProvenance.has(url)) readAloudUrlProvenance.delete(url);
    readAloudUrlProvenance.set(url, provenance);
    while (readAloudUrlProvenance.size > READ_ALOUD_PROVENANCE_LIMIT) {
        readAloudUrlProvenance.delete(readAloudUrlProvenance.keys().next().value);
    }
};
const readAloudProvenanceForUrl = (url) => (
    url && typeof url === 'string' ? readAloudUrlProvenance.get(url) || null : null
);

// Diagnostics: bridge resolution events land in the same window.__alloTtsTrace
// ring the TTS module and karaoke overlay write, so one snapshot shows where a
// stuck read-aloud actually stalled (overlay → bridge → provider).
const READ_ALOUD_TRACE_MAX = 150;
const readAloudTrace = (event, detail) => {
    try {
        if (typeof window === 'undefined') return;
        const buffer = window.__alloTtsTrace || (window.__alloTtsTrace = []);
        buffer.push({ at: Date.now(), event: event, detail: detail || null });
        while (buffer.length > READ_ALOUD_TRACE_MAX) buffer.shift();
    } catch (_) {}
};

// Compatibility facade for the existing host globals. It intentionally owns
// no window globals itself: hosts opt in by constructing it and delegating
// their release-cycle shims to the returned methods.
const createReadAloudLegacyBridge = (dependencies = {}) => {
    const getResource = typeof dependencies.getResource === 'function'
        ? dependencies.getResource
        : () => null;
    const getStore = typeof dependencies.getStore === 'function'
        ? dependencies.getStore
        : () => null;
    const getProfile = typeof dependencies.getProfile === 'function'
        ? dependencies.getProfile
        : () => ({});
    const synthesize = typeof dependencies.synthesize === 'function'
        ? dependencies.synthesize
        : async () => null;
    const encode = typeof dependencies.encode === 'function' ? dependencies.encode : null;
    const persist = typeof dependencies.persist === 'function' ? dependencies.persist : null;
    const normalize = typeof dependencies.normalize === 'function'
        ? dependencies.normalize
        : (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    const notify = typeof dependencies.notify === 'function' ? dependencies.notify : null;
    const enumerateResourceSegments = typeof dependencies.enumerateResourceSegments === 'function'
        ? dependencies.enumerateResourceSegments
        : null;
    const defaultIsCancelled = typeof dependencies.isCancelled === 'function'
        ? dependencies.isCancelled
        : () => false;
    const SUPPORTED_TYPES = new Set(['simplified', 'faq', 'glossary']);
    const ADAPTER_VERSION = 1;

    function safeCall(fn, fallback, args) {
        try { return fn.apply(null, args || []); } catch (_) { return fallback; }
    }

    function liveResource() {
        return safeCall(getResource, null, []);
    }

    function resourceTypeOf(resource) {
        const type = String(resource && resource.type || '').trim().toLowerCase();
        return SUPPORTED_TYPES.has(type) || (typeof window !== 'undefined' && window.AlloModules?.ResourceReadAloud?.supports(type)) ? type : null;
    }

    function cleanText(value, context) {
        const raw = value && typeof value === 'object'
            ? (value.spokenText != null ? value.spokenText
                : (value.text != null ? value.text
                    : (value.sentence != null ? value.sentence : '')))
            : value;
        return String(safeCall(normalize, '', [raw, context || {}]) || '').trim();
    }

    // FNV-1a plus length gives a compact, deterministic text fingerprint. It
    // is stable across array reordering, unlike positional sentence indexes.
    function textFingerprint(text) {
        const value = String(text || '');
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return 'txt-' + value.length.toString(36) + '-' + (hash >>> 0).toString(36);
    }

    function descriptorSynthesisProfile(value) {
        if (!value || typeof value !== 'object') return null;
        const profile = Object.assign({},
            value.synthesisProfile && typeof value.synthesisProfile === 'object' ? value.synthesisProfile : {},
            value.profile && typeof value.profile === 'object' ? value.profile : {}
        );
        ['voice', 'language', 'provider', 'engine', 'engineVersion', 'model', 'modelVersion',
            'speed', 'synthesisRate', 'directionFingerprint', 'voiceResolverVersion'].forEach((key) => {
            if (value[key] != null) profile[key] = value[key];
        });
        if (profile.synthesisRate == null && profile.speed != null) profile.synthesisRate = profile.speed;
        if (profile.speed == null && profile.synthesisRate != null) profile.speed = profile.synthesisRate;
        return Object.keys(profile).length ? profile : null;
    }

    function segmentDescriptor(value, index, context, fallbackSegmentId) {
        const spokenText = cleanText(value, Object.assign({ index }, context || {}));
        if (!spokenText) return null;
        const fingerprint = textFingerprint(spokenText);
        const original = value && typeof value === 'object' ? value : null;
        const suppliedIdentity = original && original.identity && typeof original.identity === 'object'
            ? original.identity
            : null;
        const suppliedSegmentId = original && (original.segmentId != null ||
            (suppliedIdentity && suppliedIdentity.segmentId != null))
            ? String(original.segmentId != null ? original.segmentId : suppliedIdentity.segmentId).trim()
            : '';
        const suppliedScopeId = original && (original.scopeId != null ||
            (suppliedIdentity && suppliedIdentity.scopeId != null))
            ? String(original.scopeId != null ? original.scopeId : suppliedIdentity.scopeId).trim()
            : '';
        const synthesisProfile = descriptorSynthesisProfile(original);
        return {
            spokenText,
            fingerprint,
            index,
            original: value,
            segmentId: suppliedSegmentId || fallbackSegmentId || ('text/' + fingerprint),
            scopeId: suppliedScopeId || 'main',
            kind: original && original.kind,
            faqIndex: original && original.faqIndex,
            entryId: original && original.entryId,
            field: original && original.field,
            language: original && original.language,
            occurrence: original && original.occurrence != null && Number.isInteger(Number(original.occurrence)) ? Math.max(0, Number(original.occurrence)) : null,
            identity: original && original.identity != null ? original.identity : null,
            synthesisProfile,
        };
    }

    function descriptorsFromList(list, context) {
        return (Array.isArray(list) ? list : []).map((value, index) => (
            segmentDescriptor(value, index, context)
        )).filter(Boolean);
    }

    function fallbackFaqSegments(resource, context) {
        const data = Array.isArray(resource && resource.data)
            ? resource.data
            : (Array.isArray(resource && resource.faqs)
                ? resource.faqs
                : (Array.isArray(resource && resource.data && resource.data.faqs) ? resource.data.faqs : []));
        const flattened = [];
        data.forEach((item, faqIndex) => {
            if (!item) return;
            const question = item.question != null ? item.question : item.q;
            const answer = item.answer != null ? item.answer : item.a;
            if (question != null) flattened.push({
                text: question,
                faqIndex,
                kind: 'question',
                segmentId: 'faq/' + faqIndex + '/question',
            });
            if (answer != null) flattened.push({
                text: answer,
                faqIndex,
                kind: 'answer',
                segmentId: 'faq/' + faqIndex + '/answer',
            });
        });
        return descriptorsFromList(flattened, context);
    }

    function canonicalResourceSegments(resource, resourceType, context) {
        if (enumerateResourceSegments) {
            const enumerated = safeCall(enumerateResourceSegments, null, [resource, context]);
            if (Array.isArray(enumerated) && enumerated.length) {
                return descriptorsFromList(enumerated, context);
            }
        }
        const registry = typeof window !== 'undefined' && window.AlloModules?.ResourceReadAloud;
        if (registry?.supports(resourceType)) return descriptorsFromList(registry.enumerate(resource), context);
        if (resourceType === 'faq') return fallbackFaqSegments(resource, context);
        if (resourceType === 'glossary' && typeof enumerateGlossaryReadAloudSegments === 'function') {
            return descriptorsFromList(enumerateGlossaryReadAloudSegments(resource, context || {}), context);
        }
        return [];
    }

    function reconcileSuppliedSentences(canonical, supplied, context, occurrence) {
        if (!Array.isArray(supplied)) return canonical;
        const availableByText = new Map();
        const availableByLocator = new Map();
        const claimed = new Set();
        const locatorKey = (descriptor) => descriptor && descriptor.segmentId
            ? String(descriptor.scopeId || 'main') + '\u0000' + String(descriptor.segmentId)
            : '';
        canonical.forEach((descriptor) => {
            if (!availableByText.has(descriptor.spokenText)) availableByText.set(descriptor.spokenText, []);
            availableByText.get(descriptor.spokenText).push(descriptor);
            const key = locatorKey(descriptor);
            if (key) {
                if (!availableByLocator.has(key)) availableByLocator.set(key, []);
                availableByLocator.get(key).push(descriptor);
            }
        });
        const mergeSupplied = (descriptor, suppliedDescriptor, index) => {
            claimed.add(descriptor);
            return Object.assign({}, descriptor, {
                suppliedIndex: index,
                occurrence: suppliedDescriptor.occurrence != null ? suppliedDescriptor.occurrence : descriptor.occurrence,
                identity: suppliedDescriptor.identity != null ? suppliedDescriptor.identity : descriptor.identity,
                synthesisProfile: suppliedDescriptor.synthesisProfile || descriptor.synthesisProfile,
            });
        };
        // A single-sentence request may target the caller's Nth occurrence of
        // a duplicated sentence. Without it, the first canonical twin absorbed
        // every duplicate's resolve/capture and the saved counter stayed short.
        const useOccurrence = supplied.length === 1 && Number.isInteger(occurrence) && occurrence >= 0;
        return supplied.map((value, index) => {
            const suppliedDescriptor = segmentDescriptor(value, index, context);
            const spokenText = suppliedDescriptor && suppliedDescriptor.spokenText;
            if (!spokenText) return null;

            // Explicit semantic identity wins over text. Glossaries may contain
            // duplicate terms and translations, so first-text-match is unsafe.
            const explicitKey = locatorKey(suppliedDescriptor);
            if (explicitKey) {
                const exact = (availableByLocator.get(explicitKey) || [])
                    .find((descriptor) => !claimed.has(descriptor));
                if (exact) {
                    if (typeof window !== 'undefined' && window.AlloModules?.ResourceReadAloud?.supports(context.resourceType) && exact.spokenText !== spokenText) return null;
                    return mergeSupplied(exact, suppliedDescriptor, index);
                }
            }

            const matches = availableByText.get(spokenText);
            if (matches && matches.length) {
                const explicitOccurrence = suppliedDescriptor && Number.isInteger(suppliedDescriptor.occurrence)
                    ? suppliedDescriptor.occurrence
                    : null;
                const descriptor = useOccurrence
                    ? matches[occurrence]
                    : (explicitOccurrence != null
                        ? matches[explicitOccurrence]
                        : matches.find((candidate) => !claimed.has(candidate)));
                if (!descriptor || claimed.has(descriptor)) return null;
                return mergeSupplied(descriptor, suppliedDescriptor, index);
            }
            // A sentence that is genuinely outside the resource has no stable
            // semantic locator; retain the legacy text-derived fallback.
            if (typeof window !== 'undefined' && window.AlloModules?.ResourceReadAloud?.supports(context.resourceType)) return null;
            return Object.assign({}, suppliedDescriptor, { segmentId: 'text/' + textFingerprint(spokenText) });
        }).filter(Boolean);
    }

    function resourceSegments(resource, resourceType, suppliedSentences, occurrence) {
        const context = { resource, resourceType, operation: 'legacy-enumerate' };
        const canonical = canonicalResourceSegments(resource, resourceType, context);
        return reconcileSuppliedSentences(canonical, suppliedSentences, context, occurrence);
    }

    function identityFor(resourceType, segment) {
        return {
            identityVersion: 4,
            adapterId: 'alloflow.' + resourceType + '.read-aloud',
            adapterVersion: ADAPTER_VERSION,
            scopeId: segment.scopeId || 'main',
            segmentId: segment.segmentId,
            spokenFingerprint: segment.fingerprint || textFingerprint(segment.spokenText),
            spokenText: segment.spokenText,
        };
    }

    function bindingFor(suppliedSentences, lane, occurrence) {
        const resource = liveResource();
        const resourceType = resourceTypeOf(resource);
        if (!resourceType) return null;
        const resourceId = String(resource.id || resource.resourceId || resource.__alloUnsavedTtsToken || 'unsaved');
        const rawSegments = resourceSegments(resource, resourceType, suppliedSentences, occurrence);
        const adapter = {
            id: 'alloflow.' + resourceType + '.read-aloud',
            version: ADAPTER_VERSION,
            enumerate: () => rawSegments,
            spokenText: (segment) => segment.spokenText,
            fields: (segment) => {
                const identity = identityFor(resourceType, segment);
                return {
                    segmentId: identity.segmentId,
                    storageKey: identity,
                    spokenFingerprint: identity.spokenFingerprint,
                    adapterId: identity.adapterId,
                    adapterVersion: identity.adapterVersion,
                    scopeId: identity.scopeId,
                    kind: segment.kind,
                    faqIndex: segment.faqIndex,
                    occurrence: segment.occurrence,
                    synthesisProfile: segment.synthesisProfile || undefined,
                };
            },
        };
        const serviceDependencies = {
            getStoreModule: (context) => safeCall(getStore, null, [context.lane, context]),
            getResource: () => resource,
            getSynthesisProfile: (context) => safeCall(getProfile, {}, [context]),
            synthesize,
            normalize,
        };
        if (encode) serviceDependencies.encode = encode;
        if (persist) serviceDependencies.persist = persist;
        const service = createReadAloudAudioService(serviceDependencies);
        const controller = service.forResource({
            resourceId,
            resourceType,
            adapter,
            lane: lane || 'reference',
            persistencePolicy: 'durable',
        });
        return { controller, resource, resourceId, resourceType, rawSegments };
    }

    function firstSegment(binding) {
        if (!binding) return null;
        const list = binding.controller.segments();
        return list.length ? list[0] : null;
    }

    function notifyStatus(binding, sentence, status, extra) {
        if (!notify) return;
        safeCall(notify, null, [sentence, status, binding ? binding.resourceId : null, extra || {}]);
    }

    function failureDetail(error) {
        if (!error) return null;
        if (error.detail && typeof error.detail === 'object') return error.detail;
        return {
            code: error.code || 'read-aloud-failed',
            reason: error.message || 'Read-aloud audio could not be saved.',
            retryable: true,
        };
    }

    async function resolve(sentence, options = {}) {
        if (!sentence) return null;
        const binding = bindingFor([sentence], options.lane || 'reference', options.occurrence);
        const segment = firstSegment(binding);
        if (!segment) return null;
        // Snapshot {url → profile, segment} at the moment of resolution: the
        // controller's 'resolved' event carries the exact merged profile it
        // matched or synthesized with, so a later capture persists the clip
        // under the voice the learner actually heard even if the settings
        // hydrated or changed while generation/startup was pending.
        const unsubscribe = binding.controller.subscribe((event) => {
            if (!event || event.type !== 'resolved' || !event.url) return;
            recordReadAloudProvenance(event.url, {
                profile: event.profile ? Object.assign({}, event.profile) : null,
                segmentId: event.segment && event.segment.segmentId != null
                    ? String(event.segment.segmentId)
                    : String(segment.segmentId),
            });
        });
        const resolveStartedAt = Date.now();
        readAloudTrace('bridge:resolve-start', {
            segmentId: segment.segmentId,
            reason: options.reason || 'resolve',
            priority: options.priority || null,
            occurrence: Number.isInteger(options.occurrence) ? options.occurrence : null,
        });
        try {
            const resolvedUrl = await binding.controller.resolve(segment, {
                signal: options.signal,
                reason: options.reason || 'resolve',
                priority: options.priority,
                maxRetries: options.maxRetries,
                profile: options.profile,
                force: options.force === true,
            });
            readAloudTrace('bridge:resolve-settled', {
                segmentId: segment.segmentId,
                ok: !!resolvedUrl,
                ms: Date.now() - resolveStartedAt,
            });
            return resolvedUrl;
        } catch (error) {
            readAloudTrace('bridge:resolve-error', {
                segmentId: segment.segmentId,
                ms: Date.now() - resolveStartedAt,
                error: String((error && error.message) || error).substring(0, 140),
            });
            return null;
        } finally {
            unsubscribe();
        }
    }

    function inspect(sentence, lane, options) {
        if (!sentence) return null;
        if (lane && typeof lane === 'object') {
            options = lane;
            lane = options.lane;
        }
        options = options && typeof options === 'object' ? options : {};
        const binding = bindingFor([sentence], lane || options.lane || 'reference', options.occurrence);
        const segment = firstSegment(binding);
        if (!segment) return null;
        try {
            return binding.controller.inspect(segment, { profile: options.profile });
        } catch (_) { return null; }
    }

    async function regenerate(sentence, options = {}) {
        const binding = bindingFor([sentence], 'reference', options.occurrence);
        const segment = firstSegment(binding);
        if (!segment) return null;
        try {
            return await binding.controller.regenerate(segment, {
                signal: options.signal,
                reason: options.reason || 'regenerate',
                priority: options.priority,
                maxRetries: options.maxRetries,
                profile: options.profile,
                source: options.source,
                metadata: options.metadata,
                storeOptions: Object.assign({}, options.storeOptions || {}, { allowReplaceHuman: true }),
            });
        } catch (error) {
            notifyStatus(binding, segment.spokenText, 'error', failureDetail(error));
            return null;
        }
    }

    async function prepare(sentences, onProgress, options = {}) {
        const suppliedSegments = Array.isArray(options.entries) && options.entries.length
            ? options.entries
            : (Array.isArray(sentences) ? sentences : null);
        const binding = bindingFor(suppliedSegments, 'reference');
        if (!binding) {
            return { ok: false, generated: 0, failed: 0, remaining: 0, cancelled: false, attempted: 0, total: 0, bytes: 0, failure: null };
        }
        const controller = binding.controller;
        const allSegments = controller.segments();
        const pending = allSegments.filter((segment) => {
            try { return controller.inspect(segment).status !== 'ready'; } catch (_) { return true; }
        });
        const total = pending.length;
        let generated = 0;
        let failed = 0;
        let attempted = 0;
        let lastFailure = null;
        const cancellationGetter = typeof options.isCancelled === 'function'
            ? options.isCancelled
            : defaultIsCancelled;
        const dynamicSignal = {};
        Object.defineProperty(dynamicSignal, 'aborted', {
            enumerable: true,
            get: () => !!((options.signal && options.signal.aborted) ||
                safeCall(cancellationGetter, false, [])),
        });
        Object.defineProperty(dynamicSignal, 'reason', {
            enumerable: true,
            get: () => options.signal && options.signal.reason,
        });

        function legacyProgress(event) {
            if (!event || event.phase !== 'segment' || event.status === 'skipped') return;
            attempted += 1;
            if (event.status === 'prepared') generated += 1;
            if (event.status === 'failed') {
                failed += 1;
                lastFailure = failureDetail(event.error);
            }
            if (typeof onProgress === 'function') {
                try { onProgress(attempted, total, event.segment && event.segment.spokenText); } catch (_) {}
            }
        }

        let cancelled = false;
        try {
            const result = await controller.prepareAll({
                signal: options.signal || dynamicSignal,
                onProgress: legacyProgress,
                profile: options.profile,
                source: options.source,
                metadata: options.metadata,
                storeOptions: options.storeOptions,
                priority: options.priority,
                maxRetries: options.maxRetries,
            });
            if (result && result.errors && result.errors.length) {
                lastFailure = failureDetail(result.errors[result.errors.length - 1].error);
            }
        } catch (error) {
            if (error && (error.name === 'AbortError' || error.code === 'aborted')) cancelled = true;
            else {
                failed += 1;
                lastFailure = failureDetail(error);
            }
        }
        const finalSummary = controller.summary();
        const remaining = Math.max(0, Number(finalSummary.stale || 0) +
            Number(finalSummary.corrupt || 0) + Number(finalSummary.missing || 0));
        return {
            ok: !cancelled && remaining === 0,
            generated,
            failed,
            remaining,
            cancelled,
            attempted,
            total,
            bytes: Number(finalSummary.estimatedBytes || 0),
            failure: lastFailure,
        };
    }

    async function capturePlayed(sentence, url, options = {}) {
        if (!sentence || !url) return false;
        const provenance = readAloudProvenanceForUrl(url);
        const hasOccurrence = Number.isInteger(options.occurrence) && options.occurrence >= 0;
        const binding = bindingFor([sentence], 'reference', options.occurrence);
        if (!binding) return false;
        let segment = null;
        if (!hasOccurrence && provenance && provenance.segmentId != null) {
            // No explicit occurrence: trust the URL's own resolution record
            // over first-text-match so a duplicated sentence still captures
            // into the segment that actually requested this clip.
            try {
                segment = binding.controller.segments().find((candidate) => (
                    String(candidate.segmentId) === String(provenance.segmentId)
                )) || null;
            } catch (_) { segment = null; }
        }
        if (!segment) segment = firstSegment(binding);
        if (!segment) return false;
        try {
            if (binding.controller.inspect(segment).status === 'ready') return false;
            notifyStatus(binding, segment.spokenText, 'saving');
            await binding.controller.capturePlayed(segment, url, {
                // The resolution-time profile travels with the URL; without it
                // a mid-flight settings change relabels the clip (Puck audio
                // stored as Kore) and later compatible lookups accept it.
                profile: options.profile || (provenance && provenance.profile) || undefined,
                signal: options.signal,
                metadata: options.metadata,
                storeOptions: options.storeOptions,
                source: options.source || 'ai-played',
            });
            const summary = binding.controller.summary();
            notifyStatus(binding, segment.spokenText, 'saved', { storedBytes: summary.estimatedBytes || 0 });
            return true;
        } catch (error) {
            notifyStatus(binding, segment.spokenText, 'error', failureDetail(error));
            return false;
        }
    }

    async function saveRecording(sentence, blob, source, lane, options = {}) {
        if (!sentence || !blob) return false;
        let suppliedSource = source;
        let suppliedLane = lane;
        let suppliedOptions = options && typeof options === 'object' ? options : {};
        if (source && typeof source === 'object') {
            suppliedOptions = source;
            suppliedSource = source.source;
            suppliedLane = source.lane;
        } else if (lane && typeof lane === 'object') {
            suppliedOptions = lane;
            suppliedLane = lane.lane;
        }
        const selectedLane = suppliedOptions.lane || suppliedLane ||
            (String(suppliedSource || '').indexOf('human-student') === 0 ? 'student' : 'reference');
        const binding = bindingFor([sentence], selectedLane, suppliedOptions.occurrence);
        const segment = firstSegment(binding);
        if (!segment) return false;
        try {
            await binding.controller.saveRecording(segment, blob, {
                source: suppliedSource || suppliedOptions.source ||
                    (selectedLane === 'student' ? 'human-student' : 'human-teacher'),
                signal: suppliedOptions.signal,
                profile: suppliedOptions.profile,
                metadata: suppliedOptions.metadata,
                storeOptions: suppliedOptions.storeOptions,
            });
            return true;
        } catch (error) {
            notifyStatus(binding, segment.spokenText, 'error', failureDetail(error));
            return false;
        }
    }

    async function remove(sentence, lane, options = {}) {
        if (!sentence) return false;
        if (lane && typeof lane === 'object') {
            options = lane;
            lane = options.lane;
        }
        const binding = bindingFor([sentence], lane || options.lane || 'reference', options.occurrence);
        const segment = firstSegment(binding);
        if (!segment) return false;
        try {
            return !!(await binding.controller.remove(segment, { signal: options.signal }));
        } catch (_) { return false; }
    }

    async function quarantine(sentence, detail, options = {}) {
        if (!sentence) return false;
        const binding = bindingFor([sentence], options.lane || 'reference', options.occurrence);
        const segment = firstSegment(binding);
        if (!segment) return false;
        try {
            return !!(await binding.controller.quarantine(segment, detail, {
                signal: options.signal,
                reason: options.reason || 'quarantine',
            }));
        } catch (_) { return false; }
    }

    async function reconcile(lane, options = {}) {
        if (lane && typeof lane === 'object') {
            options = lane;
            lane = options.lane;
        }
        const binding = bindingFor(null, lane || options.lane || 'reference');
        if (!binding) return null;
        try {
            return await binding.controller.reconcile({
                signal: options.signal,
                reason: options.reason || 'reconcile',
                pruneAi: options.pruneAi !== false,
                persist: options.persist,
            });
        } catch (_) { return null; }
    }

    function summary(sentences, lane) {
        const binding = bindingFor(Array.isArray(sentences) ? sentences : null, lane || 'reference');
        if (!binding) return null;
        try { return binding.controller.summary(); } catch (_) { return null; }
    }

    return {
        resolve, inspect, regenerate, prepare, capturePlayed, saveRecording, remove, quarantine, reconcile, summary,
    };
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.createReadAloudAudioService = createReadAloudAudioService;
window.AlloModules.createReadAloudLegacyBridge = createReadAloudLegacyBridge;
window.AlloModules.ReadAloudAudioServiceModule = true;
console.log('[ReadAloudAudioService] registered (resource adapters + lazy live dependencies)');
let glossaryEntryIdSequence = 0;

const createGlossaryEntryId = () => {
    try {
        const cryptoApi = typeof globalThis !== 'undefined' && globalThis.crypto;
        if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
            return 'glossary-' + cryptoApi.randomUUID();
        }
    } catch (_) {}
    glossaryEntryIdSequence += 1;
    return 'glossary-' + Date.now().toString(36) + '-' + glossaryEntryIdSequence.toString(36)
        + '-' + Math.random().toString(36).slice(2, 10);
};

const cleanGlossaryEntryId = (value) => String(value == null ? '' : value).trim().slice(0, 160);

// Legacy glossary entries predate durable item identity. Assign opaque IDs once
// and persist the returned entries with the resource. IDs are deliberately not
// derived from text or array position: edits and reordering must not relocate a
// saved clip, and duplicate terms must remain independently addressable.
const normalizeGlossaryEntries = (entries, options = {}) => {
    const input = Array.isArray(entries) ? entries : [];
    const makeId = typeof options.createId === 'function' ? options.createId : createGlossaryEntryId;
    const used = new Set();
    let changed = false;
    const normalized = input.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
        let entryId = cleanGlossaryEntryId(entry.entryId || entry.glossaryEntryId);
        if (!entryId || used.has(entryId)) {
            let attempts = 0;
            do {
                entryId = cleanGlossaryEntryId(makeId(entry));
                attempts += 1;
            } while ((!entryId || used.has(entryId)) && attempts < 20);
            if (!entryId || used.has(entryId)) entryId = createGlossaryEntryId();
            changed = true;
        } else if (entry.entryId !== entryId) {
            changed = true;
        }
        used.add(entryId);
        return entry.entryId === entryId ? entry : Object.assign({}, entry, { entryId });
    });
    return { entries: changed ? normalized : input, changed };
};

const glossaryLanguageKey = (language) => {
    const value = String(language == null ? '' : language).trim();
    if (!value) return 'und';
    try { return encodeURIComponent(value.normalize('NFKC').toLocaleLowerCase('en-US')); }
    catch (_) { return encodeURIComponent(value.toLowerCase()); }
};

const glossaryEntryPathKey = (entryId) => encodeURIComponent(cleanGlossaryEntryId(entryId));

// Canonical glossary adapter enumeration shared by the host and tests. The
// caller should normalize/persist entry IDs first; entries without an ID are
// ignored rather than falling back to an unstable index identity.
const enumerateGlossaryReadAloudSegments = (resource, options = {}) => {
    if (!resource || String(resource.type || '').toLowerCase() !== 'glossary') return [];
    const entries = Array.isArray(resource.data) ? resource.data : [];
    const defaultLanguage = String(options.defaultLanguage || resource.language || resource.baseLanguage || 'English').trim() || 'English';
    const segments = [];
    const add = (entry, field, text, language, segmentSuffix) => {
        const spokenText = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
        const entryId = cleanGlossaryEntryId(entry && entry.entryId);
        if (!spokenText || !entryId) return;
        segments.push({
            text: spokenText,
            spokenText,
            entryId,
            field,
            kind: field,
            language: String(language || defaultLanguage).trim() || defaultLanguage,
            scopeId: 'main',
            segmentId: 'entry/' + glossaryEntryPathKey(entryId) + '/' + segmentSuffix,
        });
    };
    entries.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        add(entry, 'term', entry.term != null ? entry.term : entry.word, entry.termLanguage || defaultLanguage, 'term');
        add(entry, 'definition', entry.def != null ? entry.def : entry.definition, entry.definitionLanguage || defaultLanguage, 'definition');
        const translations = entry.translations && typeof entry.translations === 'object' && !Array.isArray(entry.translations)
            ? entry.translations
            : {};
        Object.keys(translations).sort((a, b) => a.localeCompare(b)).forEach((language) => {
            const translated = translations[language];
            const text = translated && typeof translated === 'object'
                ? (translated.text != null ? translated.text
                    : (translated.translation != null ? translated.translation
                        : [translated.term, translated.def || translated.definition].filter(Boolean).join(': ')))
                : translated;
            add(entry, 'translation', text, language, 'translation/' + glossaryLanguageKey(language));
        });
    });
    return segments;
};

window.AlloModules.createGlossaryEntryId = createGlossaryEntryId;
window.AlloModules.normalizeGlossaryEntries = normalizeGlossaryEntries;
window.AlloModules.enumerateGlossaryReadAloudSegments = enumerateGlossaryReadAloudSegments;
})();
