// persona_session_artifact_source.jsx
//
// Adapter between live Persona chat state and the versioned private
// read-aloud artifact contract. It owns no storage backend and never writes
// to resource history, StudentArtifactStore, or Web Storage.

const PersonaSessionArtifact = (() => {
    const STORAGE_NAMESPACE = 'persona_artifacts';
    const FILE_EXTENSION = '.allopersona.json';
    const PRIVACY_CONFIG = Object.freeze({
        owner: 'current-device-owner', ownerOnly: true, private: true,
        localOnly: true, shareable: false, includeInResourceExports: false,
        includeInMailbox: false,
    });

    function runtimeError(code, message, cause) {
        const error = new Error(message);
        error.name = 'PersonaSessionArtifactError';
        error.code = code;
        if (cause) error.cause = cause;
        return error;
    }

    function getContract(explicitContract) {
        const contract = explicitContract || (
            typeof window !== 'undefined' && window.AlloModules
            && window.AlloModules.ReadAloudArtifactContract
        );
        if (!contract
            || typeof contract.buildPrivatePersonaSessionArtifact !== 'function'
            || typeof contract.serializeReadAloudArtifact !== 'function'
            || typeof contract.validateReadAloudArtifact !== 'function'
            || typeof contract.stableIdFromParts !== 'function') {
            throw runtimeError('contract-unavailable',
                'The ReadAloudArtifactContract must be loaded before a private Persona artifact can be created.');
        }
        return contract;
    }

    function cleanText(value, max) {
        if (value == null) return '';
        return String(value).replace(/\r\n?/g, '\n').replace(/[\t\f\v ]+/g, ' ')
            .replace(/ *\n */g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 12000);
    }

    function safeStableId(value) {
        const text = cleanText(value, 240);
        return /^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,239})$/.test(text) ? text : null;
    }

    function firstText(values, max) {
        for (let index = 0; index < values.length; index += 1) {
            const value = cleanText(values[index], max);
            if (value) return value;
        }
        return '';
    }

    function asArray(value) { return Array.isArray(value) ? value : []; }

    function roleFrom(raw, hasSpeaker) {
        const role = cleanText(raw, 40).toLowerCase();
        if (role === 'user' || role === 'learner' || role === 'student') return 'learner';
        if (role === 'model' || role === 'assistant' || role === 'persona' || role === 'character') return 'persona';
        if (role === 'educator' || role === 'teacher') return 'educator';
        if (role === 'narrator') return 'narrator';
        if (!role && hasSpeaker) return 'persona';
        return null;
    }

    function splitLongUnit(unit, maxChars) {
        if (unit.length <= maxChars) return [unit];
        const output = [];
        let current = '';
        unit.split(' ').forEach((word) => {
            if (!word) return;
            if (word.length > maxChars) {
                if (current) output.push(current);
                current = '';
                for (let offset = 0; offset < word.length; offset += maxChars) {
                    output.push(word.slice(offset, offset + maxChars));
                }
                return;
            }
            const next = current ? current + ' ' + word : word;
            if (current && next.length > maxChars) { output.push(current); current = word; }
            else current = next;
        });
        if (current) output.push(current);
        return output;
    }

    function splitTranscriptText(value, maxChars = 320) {
        const text = cleanText(value, 12000);
        if (!text) return [];
        const boundedMax = Math.max(80, Math.min(1200, Math.floor(Number(maxChars) || 320)));
        const sentenceUnits = text.match(/[^.!?…]+(?:[.!?…]+(?=\s|$)|$)/gu) || [text];
        const units = [];
        sentenceUnits.forEach((unit) => {
            splitLongUnit(cleanText(unit, 12000), boundedMax).forEach((part) => { if (part) units.push(part); });
        });
        const chunks = [];
        let current = '';
        units.forEach((unit) => {
            const next = current ? current + ' ' + unit : unit;
            if (current && next.length > boundedMax) { chunks.push(current); current = unit; }
            else current = next;
        });
        if (current) chunks.push(current);
        return chunks;
    }

    function resolveTranscript(input, state) {
        const candidates = [input.messages, input.chatHistory, input.savedDialogue, input.dialogue,
            state.chatHistory, state.savedDialogue];
        for (let index = 0; index < candidates.length; index += 1) {
            if (Array.isArray(candidates[index])) return candidates[index];
        }
        return [];
    }

    function resolveParticipants(input, state) {
        const panel = asArray(input.selectedCharacters).length ? input.selectedCharacters : asArray(state.selectedCharacters);
        if (panel.length) return panel.filter((item) => item && typeof item === 'object').slice(0, 8);
        const single = input.selectedCharacter || state.selectedCharacter || input.persona;
        return single && typeof single === 'object' ? [single] : [];
    }

    function participantName(participant) {
        return firstText([participant && participant.name, participant && participant.displayName,
            participant && participant.title], 160);
    }

    function participantId(participant) {
        return safeStableId(participant && (participant.personaId || participant.id
            || participant.profileId || participant.resourceId));
    }

    function resolvePersona(input, participants, contract, resourceId) {
        const names = participants.map(participantName).filter(Boolean);
        const ids = participants.map(participantId).filter(Boolean);
        const mode = participants.length > 1 ? 'panel' : 'single';
        const explicit = input.persona && typeof input.persona === 'object' ? input.persona : {};
        const personaId = safeStableId(explicit.personaId) || (ids.length === 1 ? ids[0] : null)
            || contract.stableIdFromParts('persona-' + mode, ids.length ? ids : names);
        return {
            personaId,
            profileId: safeStableId(explicit.profileId || (participants[0] && participants[0].profileId)),
            resourceId: safeStableId(explicit.resourceId || resourceId),
            name: firstText([explicit.name, names.join(' & '), 'Persona'], 160),
        };
    }

    function speakerForMessage(raw, role, participants) {
        if (role === 'learner') return firstText([raw.speaker, raw.speakerName, raw.authorName, 'Learner'], 160);
        const fallback = participants.length === 1 ? participantName(participants[0]) : '';
        return firstText([raw.speaker, raw.speakerName, raw.characterName, raw.authorName,
            fallback, role], 160);
    }

    function messageText(raw) {
        return firstText([raw.text, raw.content, raw.message, raw.response, raw.answer], 12000);
    }

    function normalizePersonaSession(input = {}, options = {}) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw runtimeError('invalid-input', 'Persona artifact input must be an object.');
        }
        const contract = getContract(options.contract);
        const state = input.personaState && typeof input.personaState === 'object' ? input.personaState : {};
        const participants = resolveParticipants(input, state);
        const rawMessages = resolveTranscript(input, state);
        const resourceId = safeStableId(input.resourceId || input.personaResourceId);
        const persona = resolvePersona(input, participants, contract, resourceId);
        const mode = cleanText(input.mode || state.mode, 20).toLowerCase() === 'panel' || participants.length > 1
            ? 'panel' : 'single';
        const sessionSeed = firstText([input.sessionKey, input.resourceId, input.personaResourceId,
            persona.resourceId, mode + ':' + persona.personaId], 500);
        const sessionId = safeStableId(input.sessionId)
            || contract.stableIdFromParts('persona-session', [sessionSeed, mode, persona.personaId]);
        const language = firstText([input.language, input.selectedLanguage, input.leveledTextLanguage], 100);
        if (!language) throw runtimeError('language-required', 'A Persona artifact language must be passed explicitly.');
        const title = firstText([input.title, 'Private conversation with ' + persona.name], 300);
        const maxChunkChars = options.maxChunkChars || input.maxChunkChars || 320;
        const dropped = [];
        const messages = [];
        const narrationPlan = [];

        rawMessages.forEach((raw, rawIndex) => {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
                dropped.push({ index: rawIndex, reason: 'not-an-object' }); return;
            }
            const hintedSpeaker = firstText([raw.speaker, raw.speakerName, raw.characterName], 160);
            const role = roleFrom(raw.role || raw.senderRole || raw.type, Boolean(hintedSpeaker));
            const text = messageText(raw);
            if (!role || !text) {
                dropped.push({ index: rawIndex, reason: !role ? 'unsupported-role' : 'empty-text' }); return;
            }
            const speaker = speakerForMessage(raw, role, participants);
            const messageIndex = messages.length;
            const messageId = contract.stableIdFromParts('persona-message',
                [sessionId, rawIndex, role, speaker, text]);
            const chunks = splitTranscriptText(text, maxChunkChars).map((chunkText, chunkIndex) => {
                const chunkId = contract.stableIdFromParts('persona-chunk', [messageId, chunkIndex, chunkText]);
                narrationPlan.push({ messageId, messageOrder: messageIndex, chunkId, chunkOrder: chunkIndex,
                    role, speaker, text: chunkText, language });
                return { chunkId, order: chunkIndex, text: chunkText };
            });
            messages.push({ messageId, order: messageIndex, role, speaker, chunks });
        });

        const contractInput = { artifactId: safeStableId(input.artifactId) || undefined,
            sessionId, title, language, persona, messages };
        contract.buildPrivatePersonaSessionArtifact(contractInput, options.limits);
        return {
            contractInput, narrationPlan,
            diagnostics: { mode, participantNames: participants.map(participantName).filter(Boolean),
                sourceMessageCount: rawMessages.length, normalizedMessageCount: messages.length, dropped },
        };
    }

    function cleanVoice(value) { return cleanText(value, 120); }

    function resolvePlannedVoice(planItem, input, options) {
        const speakerMap = options.voiceBySpeaker || input.voiceBySpeaker || {};
        const roleMap = options.voiceByRole || input.voiceByRole || {};
        let voice = '';
        const resolver = options.resolveVoice || input.resolveVoice;
        if (typeof resolver === 'function') voice = cleanVoice(resolver(planItem));
        if (!voice && speakerMap && typeof speakerMap === 'object') {
            voice = cleanVoice(speakerMap[planItem.speaker] || speakerMap[planItem.speaker.toLowerCase()]);
        }
        if (!voice && roleMap && typeof roleMap === 'object') voice = cleanVoice(roleMap[planItem.role]);
        if (!voice) voice = cleanVoice(options.selectedVoice || input.selectedVoice);
        if (!voice) voice = cleanVoice(options.defaultVoice || input.defaultVoice);
        return voice;
    }

    function withChunkAudio(messages, planItem, audio) {
        return messages.map((message) => message.messageId !== planItem.messageId ? message : Object.assign({}, message, {
            chunks: message.chunks.map((chunk) => chunk.chunkId === planItem.chunkId
                ? Object.assign({}, chunk, { audio }) : chunk),
        }));
    }

    async function buildPrivateSessionArtifact(input = {}, options = {}) {
        const contract = getContract(options.contract);
        const normalized = normalizePersonaSession(input, Object.assign({}, options, { contract }));
        const prepareNarration = options.prepareNarration || input.prepareNarration;
        let messages = normalized.contractInput.messages;
        let artifact = contract.buildPrivatePersonaSessionArtifact(normalized.contractInput, options.limits);
        const narration = { attempted: 0, embedded: 0, failures: [] };
        if (typeof prepareNarration !== 'function') return { artifact, normalization: normalized, narration };

        for (let index = 0; index < normalized.narrationPlan.length; index += 1) {
            const planItem = normalized.narrationPlan[index];
            const voice = resolvePlannedVoice(planItem, input, options);
            narration.attempted += 1;
            if (!voice) {
                narration.failures.push({ messageId: planItem.messageId, chunkId: planItem.chunkId,
                    code: 'explicit-voice-required',
                    message: 'No selected/default voice or explicit speaker voice was supplied.' });
                continue;
            }
            const request = Object.freeze(Object.assign({}, planItem, { voice,
                synthesisRate: Number(options.synthesisRate || input.synthesisRate || 1) }));
            try {
                const prepared = await prepareNarration(request);
                const audio = prepared && prepared.audio ? prepared.audio : prepared;
                if (!audio || typeof audio !== 'object' || Array.isArray(audio)) {
                    throw runtimeError('empty-narration', 'Narration preparer returned no contract-ready audio.');
                }
                const candidateMessages = withChunkAudio(messages, planItem, audio);
                const candidateArtifact = contract.buildPrivatePersonaSessionArtifact(
                    Object.assign({}, normalized.contractInput, { messages: candidateMessages }), options.limits);
                messages = candidateMessages;
                artifact = candidateArtifact;
                narration.embedded += 1;
            } catch (error) {
                narration.failures.push({ messageId: planItem.messageId, chunkId: planItem.chunkId,
                    code: error && error.code ? String(error.code) : 'narration-failed',
                    message: cleanText(error && error.message ? error.message : 'Narration failed.', 500) });
            }
        }
        return { artifact, normalization: normalized, narration };
    }

    function assertPrivateArtifact(artifact, contract) {
        const validation = contract.validateReadAloudArtifact(artifact);
        if (!validation.ok || !artifact || artifact.artifactType !== contract.TYPES.PERSONA_SESSION) {
            throw runtimeError('invalid-private-artifact', 'Only a valid private Persona session artifact may use this runtime.');
        }
        const privacy = artifact.privacy || {};
        if (privacy.private !== true || privacy.localOnly !== true || privacy.shareable !== false
            || privacy.includeInResourceExports !== false || privacy.includeInMailbox !== false
            || privacy.ownerExportAllowed !== true) {
            throw runtimeError('privacy-policy-mismatch',
                'Persona artifact privacy flags must remain owner-only, private, local-only, and non-shareable.');
        }
        return validation.value;
    }

    function byteLength(serialized) {
        if (typeof Blob !== 'undefined') return new Blob([serialized]).size;
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(serialized).length;
        return serialized.length;
    }

    async function persistPrivateSessionArtifact(artifact, options = {}) {
        const contract = getContract(options.contract);
        const validated = assertPrivateArtifact(artifact, contract);
        const storage = options.deviceStorage;
        if (!storage || typeof storage.set !== 'function') {
            throw runtimeError('device-storage-required',
                'An initialized device-storage adapter must be injected to persist a Persona artifact.');
        }
        const serialized = contract.serializeReadAloudArtifact(validated, options.limits);
        const key = safeStableId(options.key) || validated.artifactId;
        let result;
        try { result = await storage.set(STORAGE_NAMESPACE, key, serialized, { queue: false }); }
        catch (error) {
            throw runtimeError('device-storage-write-failed',
                'The private Persona artifact could not be saved on this device.', error);
        }
        if (result && result.queued === true) {
            throw runtimeError('device-storage-not-ready',
                'Device storage is not connected; the private Persona artifact was not durably saved.');
        }
        return { namespace: STORAGE_NAMESPACE, key, bytes: byteLength(serialized), privacy: PRIVACY_CONFIG };
    }

    function safeFilename(value) {
        const stem = cleanText(value, 120).replace(/[^A-Za-z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '').slice(0, 96);
        return (stem || 'private-persona-session') + FILE_EXTENSION;
    }

    function downloadOwnerCopy(artifact, options = {}) {
        if (options.ownerInitiated !== true) {
            throw runtimeError('owner-gesture-required',
                'A private Persona artifact download must be explicitly initiated by its owner.');
        }
        const contract = getContract(options.contract);
        const validated = assertPrivateArtifact(artifact, contract);
        const doc = options.document || (typeof document !== 'undefined' ? document : null);
        const urlApi = options.URL || (typeof URL !== 'undefined' ? URL : null);
        const BlobCtor = options.Blob || (typeof Blob !== 'undefined' ? Blob : null);
        if (!doc || !urlApi || !BlobCtor || typeof urlApi.createObjectURL !== 'function') {
            throw runtimeError('download-unavailable', 'This environment cannot download a private Persona artifact.');
        }
        const serialized = contract.serializeReadAloudArtifact(validated, options.limits);
        const blobUrl = urlApi.createObjectURL(new BlobCtor([serialized], { type: 'application/json' }));
        const anchor = doc.createElement('a');
        anchor.href = blobUrl;
        anchor.download = safeFilename(options.filename || validated.title || validated.artifactId);
        anchor.rel = 'noopener';
        if (doc.body && typeof doc.body.appendChild === 'function') doc.body.appendChild(anchor);
        try { anchor.click(); }
        finally {
            if (typeof anchor.remove === 'function') anchor.remove();
            const revoke = () => urlApi.revokeObjectURL(blobUrl);
            if (typeof setTimeout === 'function') setTimeout(revoke, 0); else revoke();
        }
        return { filename: anchor.download, bytes: byteLength(serialized) };
    }

    return Object.freeze({ STORAGE_NAMESPACE, FILE_EXTENSION, PRIVACY_CONFIG, splitTranscriptText,
        normalizePersonaSession, buildPrivateSessionArtifact, persistPrivateSessionArtifact, downloadOwnerCopy });
})();

window.AlloModules = window.AlloModules || {};
window.AlloModules.PersonaSessionArtifact = PersonaSessionArtifact;
window.AlloModules.PersonaSessionArtifactModule = true;
console.log('[PersonaSessionArtifact] registered (private, local-only Persona session artifacts)');
