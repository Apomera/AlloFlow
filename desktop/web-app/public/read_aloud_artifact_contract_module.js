(function(){"use strict";
if(window.AlloModules&&window.AlloModules.ReadAloudArtifactContractModule){console.log("[CDN] ReadAloudArtifactContractModule already loaded, skipping"); return;}
// read_aloud_artifact_contract_source.jsx
//
// Pure, versioned export contracts for durable read-aloud artifacts. This
// module deliberately has no browser-storage, resource-state, clock, random,
// or network dependencies. Callers choose when and where an artifact is saved.

const ReadAloudArtifactContract = (() => {
    const SCHEMA = 'alloflow.read-aloud-artifact';
    const SCHEMA_VERSION = '1.0';
    const TYPES = Object.freeze({
        ADVENTURE_STORYBOOK: 'adventure-storybook-read-aloud',
        PERSONA_SESSION: 'persona-session-read-aloud',
    });
    const DEFAULT_LIMITS = Object.freeze({
        maxArtifactBytes: 16 * 1024 * 1024,
        maxTotalAudioBytes: 12 * 1024 * 1024,
        maxClipBytes: 2 * 1024 * 1024,
        maxScenes: 1000,
        maxSegments: 5000,
        maxMessages: 2000,
        maxChunks: 8000,
        maxTextChars: 2 * 1024 * 1024,
    });
    const AUDIO_MIMES = Object.freeze([
        'audio/aac',
        'audio/flac',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg',
        'audio/wav',
        'audio/webm',
    ]);
    const VETTING_METHODS = Object.freeze([
        'human-recording',
        'owner-approved',
        'teacher-reviewed',
        'trusted-import',
    ]);
    const ADVENTURE_PRIVACY = Object.freeze({
        policyVersion: SCHEMA_VERSION,
        classification: 'resource-export',
        private: false,
        shareable: true,
        localOnly: false,
        includeInResourceExports: true,
        includeInMailbox: true,
        containsConversation: false,
        ownerExportAllowed: true,
    });
    const PERSONA_PRIVACY = Object.freeze({
        policyVersion: SCHEMA_VERSION,
        classification: 'private-session',
        private: true,
        shareable: false,
        localOnly: true,
        includeInResourceExports: false,
        includeInMailbox: false,
        containsConversation: true,
        ownerExportAllowed: true,
    });

    const STABLE_ID_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,239})$/;
    const SOURCE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,79})$/;
    const DATA_URL_RE = /^\s*data:[^,\s]+(?:;base64)?,/i;

    function issue(code, path, message) {
        return { code, path, message };
    }

    function contractError(code, message, errors) {
        const error = new Error(message);
        error.name = 'ReadAloudArtifactContractError';
        error.code = code;
        error.errors = Array.isArray(errors) ? errors.slice() : [];
        return error;
    }

    function isPlainObject(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    }

    function strictKeys(value, allowed, path, errors) {
        if (!isPlainObject(value)) {
            errors.push(issue('not-an-object', path, (path || 'Value') + ' must be an object.'));
            return false;
        }
        const known = new Set(allowed);
        Object.keys(value).forEach((key) => {
            if (!known.has(key)) {
                errors.push(issue(
                    'unknown-field',
                    path ? path + '.' + key : key,
                    'Unknown fields are not permitted in read-aloud artifacts.'
                ));
            }
        });
        return true;
    }

    function normalizeLineEndings(value) {
        return String(value).replace(/\r\n?/g, '\n');
    }

    function readText(value, path, errors, options = {}) {
        const required = options.required !== false;
        const max = options.max || 20000;
        if (value == null) {
            if (required) errors.push(issue('missing-text', path, path + ' is required.'));
            return '';
        }
        if (typeof value !== 'string') {
            errors.push(issue('bad-text', path, path + ' must be a string.'));
            return '';
        }
        const normalized = normalizeLineEndings(value).trim();
        if (required && !normalized) errors.push(issue('missing-text', path, path + ' cannot be empty.'));
        if (normalized.length > max) {
            errors.push(issue('text-too-large', path, path + ' exceeds ' + max + ' characters.'));
        }
        if (/[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(normalized)) {
            errors.push(issue('unsafe-control-character', path, path + ' contains an unsupported control character.'));
        }
        if (DATA_URL_RE.test(normalized)) {
            errors.push(issue('data-url-not-allowed', path, 'Data URLs are not permitted in text fields.'));
        }
        return normalized.slice(0, max);
    }

    function readStableId(value, path, errors, required = true) {
        if (value == null || value === '') {
            if (required) errors.push(issue('missing-stable-id', path, path + ' is required.'));
            return null;
        }
        if (typeof value !== 'string' || !STABLE_ID_RE.test(value)) {
            errors.push(issue(
                'invalid-stable-id',
                path,
                path + ' must be an ASCII stable id (letters, numbers, dot, underscore, colon, or hyphen).'
            ));
            return null;
        }
        return value;
    }

    function positiveLimit(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
    }

    function limitsFrom(options) {
        const input = options || {};
        return {
            maxArtifactBytes: positiveLimit(input.maxArtifactBytes, DEFAULT_LIMITS.maxArtifactBytes),
            maxTotalAudioBytes: positiveLimit(input.maxTotalAudioBytes, DEFAULT_LIMITS.maxTotalAudioBytes),
            maxClipBytes: positiveLimit(input.maxClipBytes, DEFAULT_LIMITS.maxClipBytes),
            maxScenes: positiveLimit(input.maxScenes, DEFAULT_LIMITS.maxScenes),
            maxSegments: positiveLimit(input.maxSegments, DEFAULT_LIMITS.maxSegments),
            maxMessages: positiveLimit(input.maxMessages, DEFAULT_LIMITS.maxMessages),
            maxChunks: positiveLimit(input.maxChunks, DEFAULT_LIMITS.maxChunks),
            maxTextChars: positiveLimit(input.maxTextChars, DEFAULT_LIMITS.maxTextChars),
        };
    }

    function canonicalize(value, stack) {
        if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) throw contractError('non-json-number', 'Artifacts cannot contain non-finite numbers.');
            return Object.is(value, -0) ? 0 : value;
        }
        if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
            throw contractError('non-json-value', 'Artifacts must contain JSON values only.');
        }
        if (stack.has(value)) throw contractError('cyclic-value', 'Artifacts cannot contain cycles.');
        stack.add(value);
        let output;
        if (Array.isArray(value)) {
            output = value.map((item) => canonicalize(item, stack));
        } else {
            if (!isPlainObject(value)) throw contractError('non-plain-object', 'Artifacts may contain plain objects only.');
            output = {};
            Object.keys(value).sort().forEach((key) => {
                output[key] = canonicalize(value[key], stack);
            });
        }
        stack.delete(value);
        return output;
    }

    function canonicalStringify(value) {
        return JSON.stringify(canonicalize(value, new Set()));
    }

    function utf8ByteLength(value) {
        const text = String(value);
        let bytes = 0;
        for (let index = 0; index < text.length; index += 1) {
            const code = text.charCodeAt(index);
            if (code < 0x80) bytes += 1;
            else if (code < 0x800) bytes += 2;
            else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < text.length &&
                text.charCodeAt(index + 1) >= 0xDC00 && text.charCodeAt(index + 1) <= 0xDFFF) {
                bytes += 4;
                index += 1;
            } else bytes += 3;
        }
        return bytes;
    }

    function fnv1a(value) {
        const text = String(value);
        let hash = 0x811C9DC5;
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
    }

    function stableIdFromParts(prefix, parts) {
        const safePrefix = String(prefix || 'read-aloud')
            .toLowerCase()
            .replace(/[^a-z0-9._:-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 100) || 'read-aloud';
        const payload = canonicalStringify(Array.isArray(parts) ? parts.map(String) : [String(parts)]);
        return safePrefix + '-' + fnv1a(payload) + '-' + utf8ByteLength(payload).toString(36);
    }

    function base64ByteLength(value) {
        const padding = value.endsWith('==') ? 2 : (value.endsWith('=') ? 1 : 0);
        return Math.max(0, Math.floor(value.length * 3 / 4) - padding);
    }

    function normalizeBase64(value, path, errors, maxClipBytes) {
        if (typeof value !== 'string' || !value) {
            errors.push(issue('missing-audio-data', path, path + ' must contain base64 audio.'));
            return null;
        }
        if (DATA_URL_RE.test(value)) {
            errors.push(issue(
                'data-url-not-allowed',
                path,
                'Embedded audio must be bare base64; data URLs and playable URLs are rejected.'
            ));
            return null;
        }
        if (value.length > Math.ceil(maxClipBytes * 4 / 3) + 16 * 1024) {
            errors.push(issue('clip-too-large', path, 'The embedded clip exceeds the per-clip byte limit.'));
            return null;
        }
        let clean = value.replace(/[\t\n\r ]+/g, '');
        if (!clean || /[^A-Za-z0-9+/=]/.test(clean) || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
            errors.push(issue('invalid-base64', path, 'Embedded audio is not valid base64.'));
            return null;
        }
        const remainder = clean.length % 4;
        if (remainder === 1) {
            errors.push(issue('invalid-base64', path, 'Embedded audio has invalid base64 length.'));
            return null;
        }
        if (remainder) clean += '='.repeat(4 - remainder);
        const bytes = base64ByteLength(clean);
        if (!bytes) {
            errors.push(issue('missing-audio-data', path, 'Embedded audio cannot be empty.'));
            return null;
        }
        if (bytes > maxClipBytes) {
            errors.push(issue('clip-too-large', path, 'The embedded clip exceeds the per-clip byte limit.'));
            return null;
        }
        return { base64: clean, byteLength: bytes };
    }

    function normalizeProfile(value, path, errors) {
        if (value == null) return null;
        if (!strictKeys(value, [
            'voice', 'language', 'provider', 'synthesisRate', 'speed',
            'directionFingerprint', 'voiceResolverVersion',
        ], path, errors)) return null;
        const output = {};
        ['voice', 'language', 'provider', 'directionFingerprint'].forEach((key) => {
            if (value[key] == null || value[key] === '') return;
            output[key] = readText(value[key], path + '.' + key, errors, { max: 240 });
        });
        const rateValue = value.synthesisRate == null ? value.speed : value.synthesisRate;
        if (rateValue != null) {
            const rate = Number(rateValue);
            if (!Number.isFinite(rate) || rate <= 0 || rate > 4) {
                errors.push(issue('invalid-synthesis-rate', path + '.synthesisRate', 'Synthesis rate must be greater than 0 and at most 4.'));
            } else output.synthesisRate = rate;
        }
        if (value.voiceResolverVersion != null) {
            const version = Number(value.voiceResolverVersion);
            if (!Number.isFinite(version) || version <= 0 || !Number.isInteger(version)) {
                errors.push(issue('invalid-voice-resolver-version', path + '.voiceResolverVersion', 'Voice resolver version must be a positive integer.'));
            } else output.voiceResolverVersion = version;
        }
        return Object.keys(output).length ? output : null;
    }

    function normalizeAudio(value, path, errors, limits, budget) {
        if (value == null) return null;
        if (!strictKeys(value, [
            'encoding', 'mime', 'base64', 'byteLength', 'source', 'vetted',
            'vettingMethod', 'synthesisProfile',
        ], path, errors)) return null;
        if (value.encoding != null && value.encoding !== 'base64') {
            errors.push(issue('unsupported-audio-encoding', path + '.encoding', 'Only base64 embedded audio is supported.'));
        }
        const mime = typeof value.mime === 'string' ? value.mime.trim().toLowerCase() : '';
        if (AUDIO_MIMES.indexOf(mime) === -1) {
            errors.push(issue('unsupported-audio-mime', path + '.mime', 'Audio MIME type is missing or unsupported.'));
        }
        if (value.vetted !== true) {
            errors.push(issue('audio-not-vetted', path + '.vetted', 'Only explicitly vetted audio may be embedded in an artifact.'));
        }
        if (VETTING_METHODS.indexOf(value.vettingMethod) === -1) {
            errors.push(issue('invalid-vetting-method', path + '.vettingMethod', 'A recognized audio vetting method is required.'));
        }
        const source = typeof value.source === 'string' ? value.source.trim() : '';
        if (!SOURCE_RE.test(source)) {
            errors.push(issue('invalid-audio-source', path + '.source', 'Audio source must be a short stable token.'));
        }
        const encoded = normalizeBase64(value.base64, path + '.base64', errors, limits.maxClipBytes);
        if (!encoded) return null;
        if (value.byteLength != null && Number(value.byteLength) !== encoded.byteLength) {
            errors.push(issue('audio-byte-length-mismatch', path + '.byteLength', 'Declared audio byteLength does not match the base64 payload.'));
        }
        budget.totalAudioBytes += encoded.byteLength;
        budget.audioClips += 1;
        if (budget.totalAudioBytes > limits.maxTotalAudioBytes) {
            errors.push(issue('total-audio-too-large', path, 'Embedded audio exceeds the artifact audio byte limit.'));
        }
        const profile = normalizeProfile(value.synthesisProfile, path + '.synthesisProfile', errors);
        const output = {
            encoding: 'base64',
            mime: AUDIO_MIMES.indexOf(mime) >= 0 ? mime : 'audio/mpeg',
            base64: encoded.base64,
            byteLength: encoded.byteLength,
            source: SOURCE_RE.test(source) ? source : '',
            vetted: true,
            vettingMethod: VETTING_METHODS.indexOf(value.vettingMethod) >= 0 ? value.vettingMethod : '',
            synthesisProfile: profile,
        };
        return output;
    }

    function readOrder(value, fallback, path, errors) {
        if (value == null) return fallback;
        const order = Number(value);
        if (!Number.isInteger(order) || order < 0 || order > 1000000) {
            errors.push(issue('invalid-order', path, path + ' must be a non-negative integer.'));
            return fallback;
        }
        return order;
    }

    function sortedByOrder(items, idKey, path, errors) {
        const orderSet = new Set();
        items.forEach((item, index) => {
            if (orderSet.has(item.order)) {
                errors.push(issue('duplicate-order', path + '[' + index + '].order', 'Order values must be unique within a list.'));
            }
            orderSet.add(item.order);
        });
        return items.slice().sort((left, right) => {
            if (left.order !== right.order) return left.order - right.order;
            const leftId = String(left[idKey]);
            const rightId = String(right[idKey]);
            return leftId < rightId ? -1 : (leftId > rightId ? 1 : 0);
        });
    }

    function clonePolicy(policy) {
        return Object.assign({}, policy);
    }

    function transcriptLine(speaker, text) {
        return speaker ? speaker + ': ' + text : text;
    }

    function ensureArray(value, path, errors, max) {
        if (!Array.isArray(value)) {
            errors.push(issue('not-an-array', path, path + ' must be an array.'));
            return [];
        }
        if (value.length > max) errors.push(issue('too-many-items', path, path + ' exceeds its item limit.'));
        return value.slice(0, max);
    }

    function makeAdventureCandidate(input, options, errors) {
        const limits = limitsFrom(options);
        strictKeys(input, ['artifactId', 'storyId', 'resourceId', 'title', 'language', 'scenes'], '', errors);
        const storyId = readStableId(input.storyId, 'storyId', errors);
        const resourceId = readStableId(input.resourceId, 'resourceId', errors, false);
        const artifactId = input.artifactId == null
            ? stableIdFromParts('adventure-storybook-audio', [storyId || 'missing'])
            : readStableId(input.artifactId, 'artifactId', errors);
        const title = readText(input.title, 'title', errors, { max: 300 });
        const language = readText(input.language, 'language', errors, { max: 100 });
        const budget = { totalAudioBytes: 0, audioClips: 0 };
        const sceneIds = new Set();
        const segmentIds = new Set();
        let totalSegments = 0;
        const rawScenes = ensureArray(input.scenes, 'scenes', errors, limits.maxScenes);
        if (!rawScenes.length) errors.push(issue('empty-storybook', 'scenes', 'A storybook artifact needs at least one scene.'));
        let scenes = rawScenes.map((scene, sceneIndex) => {
            const path = 'scenes[' + sceneIndex + ']';
            if (!strictKeys(scene, ['sceneId', 'order', 'title', 'segments'], path, errors)) return null;
            const sceneId = readStableId(scene.sceneId, path + '.sceneId', errors);
            if (sceneId && sceneIds.has(sceneId)) errors.push(issue('duplicate-stable-id', path + '.sceneId', 'Scene ids must be unique.'));
            if (sceneId) sceneIds.add(sceneId);
            const sceneTitle = readText(scene.title == null ? '' : scene.title, path + '.title', errors, { required: false, max: 300 });
            const rawSegments = ensureArray(scene.segments, path + '.segments', errors, limits.maxSegments);
            if (!rawSegments.length) errors.push(issue('empty-scene', path + '.segments', 'Every scene needs at least one spoken segment.'));
            let segments = rawSegments.map((segment, segmentIndex) => {
                const segmentPath = path + '.segments[' + segmentIndex + ']';
                if (!strictKeys(segment, ['segmentId', 'order', 'text', 'speaker', 'audio'], segmentPath, errors)) return null;
                const segmentId = readStableId(segment.segmentId, segmentPath + '.segmentId', errors);
                if (segmentId && segmentIds.has(segmentId)) {
                    errors.push(issue('duplicate-stable-id', segmentPath + '.segmentId', 'Segment ids must be unique across the storybook.'));
                }
                if (segmentId) segmentIds.add(segmentId);
                totalSegments += 1;
                if (totalSegments > limits.maxSegments) {
                    errors.push(issue('too-many-items', segmentPath, 'The storybook exceeds its total segment limit.'));
                }
                const output = {
                    segmentId: segmentId || '',
                    order: readOrder(segment.order, segmentIndex, segmentPath + '.order', errors),
                    text: readText(segment.text, segmentPath + '.text', errors),
                    speaker: readText(segment.speaker == null ? '' : segment.speaker, segmentPath + '.speaker', errors, { required: false, max: 160 }),
                };
                const audio = normalizeAudio(segment.audio, segmentPath + '.audio', errors, limits, budget);
                if (audio) output.audio = audio;
                return output;
            }).filter(Boolean);
            segments = sortedByOrder(segments, 'segmentId', path + '.segments', errors);
            return {
                sceneId: sceneId || '',
                order: readOrder(scene.order, sceneIndex, path + '.order', errors),
                title: sceneTitle,
                segments,
            };
        }).filter(Boolean);
        scenes = sortedByOrder(scenes, 'sceneId', 'scenes', errors);
        const transcriptText = scenes.map((scene) => (
            scene.segments.map((segment) => transcriptLine(segment.speaker, segment.text)).join('\n')
        )).join('\n\n');
        if (transcriptText.length > limits.maxTextChars) {
            errors.push(issue('text-too-large', 'transcript.text', 'Transcript exceeds the artifact text limit.'));
        }
        const candidate = {
            schema: SCHEMA,
            schemaVersion: SCHEMA_VERSION,
            artifactId: artifactId || '',
            artifactType: TYPES.ADVENTURE_STORYBOOK,
            title,
            language,
            privacy: clonePolicy(ADVENTURE_PRIVACY),
            story: { storyId: storyId || '', resourceId: resourceId || null },
            scenes,
            transcript: {
                format: 'plain-text',
                text: transcriptText,
                sceneCount: scenes.length,
                segmentCount: totalSegments,
            },
        };
        checkArtifactSize(candidate, limits, errors);
        return candidate;
    }

    function normalizeRole(value, path, errors) {
        const aliases = {
            user: 'learner',
            learner: 'learner',
            assistant: 'persona',
            model: 'persona',
            persona: 'persona',
            educator: 'educator',
            narrator: 'narrator',
        };
        const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
        if (!aliases[raw]) {
            errors.push(issue(
                raw === 'system' ? 'system-message-not-persistable' : 'invalid-message-role',
                path,
                'Persona artifacts may contain learner, persona, educator, or narrator messages only.'
            ));
            return 'learner';
        }
        return aliases[raw];
    }

    function makePersonaCandidate(input, options, errors) {
        const limits = limitsFrom(options);
        strictKeys(input, ['artifactId', 'sessionId', 'title', 'language', 'persona', 'messages'], '', errors);
        const sessionId = readStableId(input.sessionId, 'sessionId', errors);
        const artifactId = input.artifactId == null
            ? stableIdFromParts('private-persona-session-audio', [sessionId || 'missing'])
            : readStableId(input.artifactId, 'artifactId', errors);
        const title = readText(input.title, 'title', errors, { max: 300 });
        const language = readText(input.language, 'language', errors, { max: 100 });
        const personaInput = isPlainObject(input.persona) ? input.persona : {};
        strictKeys(personaInput, ['personaId', 'profileId', 'resourceId', 'name'], 'persona', errors);
        const persona = {
            personaId: readStableId(personaInput.personaId, 'persona.personaId', errors) || '',
            profileId: readStableId(personaInput.profileId, 'persona.profileId', errors, false),
            resourceId: readStableId(personaInput.resourceId, 'persona.resourceId', errors, false),
            name: readText(personaInput.name == null ? '' : personaInput.name, 'persona.name', errors, { required: false, max: 160 }),
        };
        const budget = { totalAudioBytes: 0, audioClips: 0 };
        const messageIds = new Set();
        const chunkIds = new Set();
        let totalChunks = 0;
        const rawMessages = ensureArray(input.messages, 'messages', errors, limits.maxMessages);
        if (!rawMessages.length) errors.push(issue('empty-persona-session', 'messages', 'A Persona session artifact needs at least one message.'));
        let messages = rawMessages.map((message, messageIndex) => {
            const path = 'messages[' + messageIndex + ']';
            if (!strictKeys(message, ['messageId', 'order', 'role', 'speaker', 'text', 'chunks'], path, errors)) return null;
            const messageId = readStableId(message.messageId, path + '.messageId', errors);
            if (messageId && messageIds.has(messageId)) errors.push(issue('duplicate-stable-id', path + '.messageId', 'Message ids must be unique.'));
            if (messageId) messageIds.add(messageId);
            const role = normalizeRole(message.role, path + '.role', errors);
            const speaker = readText(message.speaker == null ? '' : message.speaker, path + '.speaker', errors, { required: false, max: 160 });
            let rawChunks;
            if (message.chunks == null) {
                rawChunks = [{
                    chunkId: (messageId || 'missing-message') + ':chunk-1',
                    order: 0,
                    text: message.text,
                }];
            } else {
                rawChunks = ensureArray(message.chunks, path + '.chunks', errors, limits.maxChunks);
            }
            if (!rawChunks.length) errors.push(issue('empty-message', path + '.chunks', 'Every message needs at least one transcript chunk.'));
            let chunks = rawChunks.map((chunk, chunkIndex) => {
                const chunkPath = path + '.chunks[' + chunkIndex + ']';
                if (!strictKeys(chunk, ['chunkId', 'order', 'text', 'audio'], chunkPath, errors)) return null;
                const chunkId = readStableId(chunk.chunkId, chunkPath + '.chunkId', errors);
                if (chunkId && chunkIds.has(chunkId)) errors.push(issue('duplicate-stable-id', chunkPath + '.chunkId', 'Chunk ids must be unique across the session.'));
                if (chunkId) chunkIds.add(chunkId);
                totalChunks += 1;
                if (totalChunks > limits.maxChunks) errors.push(issue('too-many-items', chunkPath, 'The session exceeds its total chunk limit.'));
                const output = {
                    chunkId: chunkId || '',
                    order: readOrder(chunk.order, chunkIndex, chunkPath + '.order', errors),
                    text: readText(chunk.text, chunkPath + '.text', errors),
                };
                const audio = normalizeAudio(chunk.audio, chunkPath + '.audio', errors, limits, budget);
                if (audio) output.audio = audio;
                return output;
            }).filter(Boolean);
            chunks = sortedByOrder(chunks, 'chunkId', path + '.chunks', errors);
            if (message.text != null && message.chunks != null) {
                const suppliedText = readText(message.text, path + '.text', errors);
                const chunkText = chunks.map((chunk) => chunk.text).join(' ');
                if (suppliedText !== chunkText) {
                    errors.push(issue('message-text-mismatch', path + '.text', 'Message text must equal its ordered chunk text.'));
                }
            }
            return {
                messageId: messageId || '',
                order: readOrder(message.order, messageIndex, path + '.order', errors),
                role,
                speaker,
                chunks,
            };
        }).filter(Boolean);
        messages = sortedByOrder(messages, 'messageId', 'messages', errors);
        const transcriptText = messages.map((message) => {
            const messageText = message.chunks.map((chunk) => chunk.text).join(' ');
            const label = message.speaker || message.role;
            return transcriptLine(label, messageText);
        }).join('\n');
        if (transcriptText.length > limits.maxTextChars) {
            errors.push(issue('text-too-large', 'transcript.text', 'Transcript exceeds the artifact text limit.'));
        }
        const candidate = {
            schema: SCHEMA,
            schemaVersion: SCHEMA_VERSION,
            artifactId: artifactId || '',
            artifactType: TYPES.PERSONA_SESSION,
            title,
            language,
            privacy: clonePolicy(PERSONA_PRIVACY),
            persona,
            session: { sessionId: sessionId || '', messages },
            transcript: {
                format: 'plain-text',
                text: transcriptText,
                messageCount: messages.length,
                chunkCount: totalChunks,
            },
        };
        checkArtifactSize(candidate, limits, errors);
        return candidate;
    }

    function checkArtifactSize(candidate, limits, errors) {
        try {
            const bytes = utf8ByteLength(canonicalStringify(candidate));
            if (bytes > limits.maxArtifactBytes) {
                errors.push(issue('artifact-too-large', '', 'Serialized artifact exceeds the artifact byte limit.'));
            }
        } catch (error) {
            errors.push(issue(error.code || 'unserializable-artifact', '', error.message || 'Artifact is not serializable.'));
        }
    }

    function policiesEqual(left, right) {
        try { return canonicalStringify(left) === canonicalStringify(right); }
        catch (_) { return false; }
    }

    function validateTranscript(input, expected, type, errors) {
        const allowed = type === TYPES.ADVENTURE_STORYBOOK
            ? ['format', 'text', 'sceneCount', 'segmentCount']
            : ['format', 'text', 'messageCount', 'chunkCount'];
        if (!strictKeys(input, allowed, 'transcript', errors)) return;
        if (!policiesEqual(input, expected)) {
            errors.push(issue('transcript-mismatch', 'transcript', 'Transcript metadata and text must match the ordered artifact content.'));
        }
    }

    function validateReadAloudArtifact(input, options = {}) {
        const errors = [];
        if (!isPlainObject(input)) {
            return { ok: false, errors: [issue('not-an-object', '', 'Artifact must be an object.')], value: null, stats: null };
        }
        const type = input.artifactType;
        const rootAllowed = type === TYPES.ADVENTURE_STORYBOOK
            ? ['schema', 'schemaVersion', 'artifactId', 'artifactType', 'title', 'language', 'privacy', 'story', 'scenes', 'transcript']
            : ['schema', 'schemaVersion', 'artifactId', 'artifactType', 'title', 'language', 'privacy', 'persona', 'session', 'transcript'];
        strictKeys(input, rootAllowed, '', errors);
        if (input.schema !== SCHEMA) errors.push(issue('unsupported-schema', 'schema', 'Unsupported read-aloud artifact schema.'));
        if (input.schemaVersion !== SCHEMA_VERSION) errors.push(issue('unsupported-version', 'schemaVersion', 'Unsupported read-aloud artifact version.'));
        if (type !== TYPES.ADVENTURE_STORYBOOK && type !== TYPES.PERSONA_SESSION) {
            errors.push(issue('unknown-artifact-type', 'artifactType', 'Unknown read-aloud artifact type.'));
        }
        let candidate = null;
        if (type === TYPES.ADVENTURE_STORYBOOK) {
            if (!strictKeys(input.story, ['storyId', 'resourceId'], 'story', errors)) input = Object.assign({}, input, { story: {} });
            if (!policiesEqual(input.privacy, ADVENTURE_PRIVACY)) {
                errors.push(issue('invalid-privacy-policy', 'privacy', 'Adventure Storybook privacy flags do not match the export contract.'));
            }
            candidate = makeAdventureCandidate({
                artifactId: input.artifactId,
                storyId: input.story.storyId,
                resourceId: input.story.resourceId,
                title: input.title,
                language: input.language,
                scenes: input.scenes,
            }, options, errors);
            validateTranscript(input.transcript, candidate.transcript, type, errors);
        } else if (type === TYPES.PERSONA_SESSION) {
            if (!strictKeys(input.session, ['sessionId', 'messages'], 'session', errors)) input = Object.assign({}, input, { session: {} });
            if (!policiesEqual(input.privacy, PERSONA_PRIVACY)) {
                errors.push(issue('persona-artifact-must-remain-private', 'privacy', 'Persona session artifacts must remain private, local-only, and non-shareable.'));
            }
            candidate = makePersonaCandidate({
                artifactId: input.artifactId,
                sessionId: input.session.sessionId,
                title: input.title,
                language: input.language,
                persona: input.persona,
                messages: input.session.messages,
            }, options, errors);
            validateTranscript(input.transcript, candidate.transcript, type, errors);
        }
        if (!candidate || errors.length) return { ok: false, errors, value: null, stats: null };
        const stats = artifactStats(candidate);
        return { ok: true, errors: [], value: candidate, stats };
    }

    function artifactStats(artifact) {
        let audioClips = 0;
        let totalAudioBytes = 0;
        const visitAudio = (audio) => {
            if (!audio) return;
            audioClips += 1;
            totalAudioBytes += Number(audio.byteLength) || 0;
        };
        if (artifact.artifactType === TYPES.ADVENTURE_STORYBOOK) {
            artifact.scenes.forEach((scene) => scene.segments.forEach((segment) => visitAudio(segment.audio)));
        } else {
            artifact.session.messages.forEach((message) => message.chunks.forEach((chunk) => visitAudio(chunk.audio)));
        }
        return {
            artifactBytes: utf8ByteLength(canonicalStringify(artifact)),
            audioClips,
            totalAudioBytes,
        };
    }

    function throwForErrors(errors, code, message) {
        if (errors.length) throw contractError(code, message, errors);
    }

    function buildAdventureStorybookArtifact(input, options = {}) {
        const errors = [];
        if (!isPlainObject(input)) {
            throw contractError('invalid-adventure-artifact', 'Adventure Storybook artifact input must be an object.', [
                issue('not-an-object', '', 'Artifact input must be an object.'),
            ]);
        }
        const candidate = makeAdventureCandidate(input, options, errors);
        throwForErrors(errors, 'invalid-adventure-artifact', 'Adventure Storybook read-aloud artifact is invalid.');
        return candidate;
    }

    function buildPrivatePersonaSessionArtifact(input, options = {}) {
        const errors = [];
        if (!isPlainObject(input)) {
            throw contractError('invalid-persona-artifact', 'Persona session artifact input must be an object.', [
                issue('not-an-object', '', 'Artifact input must be an object.'),
            ]);
        }
        const candidate = makePersonaCandidate(input, options, errors);
        throwForErrors(errors, 'invalid-persona-artifact', 'Private Persona session read-aloud artifact is invalid.');
        return candidate;
    }

    function serializeReadAloudArtifact(input, options = {}) {
        const result = validateReadAloudArtifact(input, options);
        if (!result.ok) {
            throw contractError('invalid-read-aloud-artifact', 'Cannot serialize an invalid read-aloud artifact.', result.errors);
        }
        return canonicalStringify(result.value);
    }

    function parseReadAloudArtifact(serialized, options = {}) {
        if (typeof serialized !== 'string') {
            throw contractError('invalid-serialized-artifact', 'Serialized read-aloud artifact must be a JSON string.', [
                issue('not-a-string', '', 'Serialized artifact must be a string.'),
            ]);
        }
        const limits = limitsFrom(options);
        if (utf8ByteLength(serialized) > limits.maxArtifactBytes) {
            throw contractError('artifact-too-large', 'Serialized read-aloud artifact exceeds the byte limit.', [
                issue('artifact-too-large', '', 'Serialized artifact exceeds the artifact byte limit.'),
            ]);
        }
        let parsed;
        try { parsed = JSON.parse(serialized); }
        catch (_) {
            throw contractError('invalid-json', 'Serialized read-aloud artifact is not valid JSON.', [
                issue('invalid-json', '', 'Serialized artifact is not valid JSON.'),
            ]);
        }
        const result = validateReadAloudArtifact(parsed, options);
        if (!result.ok) {
            throw contractError('invalid-read-aloud-artifact', 'Parsed read-aloud artifact failed validation.', result.errors);
        }
        return result.value;
    }

    return Object.freeze({
        SCHEMA,
        SCHEMA_VERSION,
        TYPES,
        DEFAULT_LIMITS,
        AUDIO_MIMES,
        VETTING_METHODS,
        ADVENTURE_PRIVACY,
        PERSONA_PRIVACY,
        canonicalStringify,
        stableIdFromParts,
        validateReadAloudArtifact,
        buildAdventureStorybookArtifact,
        buildPrivatePersonaSessionArtifact,
        serializeReadAloudArtifact,
        parseReadAloudArtifact,
    });
})();

window.AlloModules = window.AlloModules || {};
window.AlloModules.ReadAloudArtifactContract = ReadAloudArtifactContract;
window.AlloModules.ReadAloudArtifactContractModule = true;
console.log('[ReadAloudArtifactContract] registered (Adventure Storybook + private Persona session artifacts)');
})();
