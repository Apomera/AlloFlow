// behavior_lens_workspace_module.js
// Pure student-workspace lifecycle helpers for BehaviorLens.
(function () {
    if (typeof window === 'undefined') return;
    window.AlloModules = window.AlloModules || {};
    if (window.AlloModules.BehaviorLensWorkspace) return;

    function createHydrationGuard() {
        var generation = 0;
        var identity = null;
        return {
            begin: function (nextIdentity) {
                var previousIdentity = identity;
                identity = nextIdentity;
                generation += 1;
                return {
                    identity: nextIdentity,
                    generation: generation,
                    changed: previousIdentity !== null && previousIdentity !== nextIdentity
                };
            },
            isCurrent: function (token) {
                return !!token && token.generation === generation && token.identity === identity;
            }
        };
    }

    function emptyStudentProfile() {
        return {
            interests: '', strengths: '', triggers: '',
            goals: '', accommodations: '', notes: ''
        };
    }

    function normalizeWorkspace(data) {
        var source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
        var profile = source.studentProfile && typeof source.studentProfile === 'object' && !Array.isArray(source.studentProfile)
            ? source.studentProfile : {};
        var normalizedBehaviors = normalizeTargetBehaviors(source.targetBehaviors, source.abcEntries);
        var normalizedAbc = normalizeAbcEntries(source.abcEntries, { targetBehaviors: normalizedBehaviors });
        var normalizedObservations = normalizeObservationSessions(source.observationSessions, { targetBehaviors: normalizedBehaviors });
        return {
            version: WORKSPACE_VERSION,
            abcEntries: normalizedAbc.items,
            observationSessions: normalizedObservations.items,
            sessionNotes: Array.isArray(source.sessionNotes) ? source.sessionNotes.slice(0, 500) : [],
            teamNotes: Array.isArray(source.teamNotes) ? source.teamNotes.slice(0, 500) : [],
            studentProfile: Object.assign(emptyStudentProfile(), sanitizeJsonObject(profile, 64 * 1024)),
            sessionHistory: Array.isArray(source.sessionHistory) ? source.sessionHistory.slice(0, 1000) : [],
            designPhases: Array.isArray(source.designPhases) ? source.designPhases.slice(0, 100) : [],
            activityRegistry: sanitizeJsonObject(source.activityRegistry, 256 * 1024),
            activeDesign: sanitizeJsonValue(source.activeDesign, { maxBytes: 64 * 1024 }),
            workflowTrack: boundedText(source.workflowTrack, 100) || null,
            workflowSubSteps: sanitizeJsonObject(source.workflowSubSteps, 128 * 1024),
            graphExport: sanitizeJsonValue(source.graphExport, { maxBytes: 128 * 1024 }),
            effectSizeResults: sanitizeJsonValue(source.effectSizeResults, { maxBytes: 128 * 1024 }),
            aiAnalysis: sanitizeJsonValue(source.aiAnalysis, { maxBytes: 256 * 1024 }),
            fullSummary: boundedText(source.fullSummary, 50000),
            dismissedAlerts: normalizeStringArray(source.dismissedAlerts, 5000, 160),
            visitedPanels: normalizeStringArray(source.visitedPanels, 5000, 160),
            favorites: Array.isArray(source.favorites) ? normalizeStringArray(source.favorites, 100, 160) : null,
            userRole: boundedText(source.userRole, 80) || null,
            targetBehaviors: normalizedBehaviors,
            toolState: normalizeToolState(source.toolState),
            deletedAbcEntries: normalizeDeletedAbcEntries(source.deletedAbcEntries, normalizedBehaviors),
            auditLog: normalizeAuditLog(source.auditLog),
            workflowDiagnostics: normalizeWorkflowDiagnostics(source.workflowDiagnostics),
            normalizationReport: {
                abcEntries: normalizedAbc.report,
                observationSessions: normalizedObservations.report
            },
            savedAt: normalizeIsoTimestamp(source.savedAt),
            revision: workspaceRevision(source)
        };
    }

    function hasWorkspaceData(data) {
        return !!(data && typeof data === 'object' && (
            Array.isArray(data.abcEntries) || Array.isArray(data.observationSessions) ||
            Array.isArray(data.sessionHistory) || Array.isArray(data.sessionNotes) ||
            Array.isArray(data.teamNotes) || !!data.studentProfile
        ));
    }

    function parseStoredArray(value) {
        if (!value) return [];
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    }

    function parseDirtyMarker(value) {
        if (!value) return null;
        var parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object' || parsed.pending !== true) return null;
        return {
            pending: true,
            revision: normalizeRevision(parsed.revision),
            savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
            snapshotId: typeof parsed.snapshotId === 'string' ? parsed.snapshotId : null
        };
    }

    function sameWorkspaceEdit(left, right) {
        if (!left || !right) return false;
        var leftSnapshotId = typeof left.snapshotId === 'string' && left.snapshotId ? left.snapshotId : null;
        var rightSnapshotId = typeof right.snapshotId === 'string' && right.snapshotId ? right.snapshotId : null;
        if (leftSnapshotId || rightSnapshotId) {
            return !!leftSnapshotId && leftSnapshotId === rightSnapshotId;
        }
        return (left.savedAt || null) === (right.savedAt || null);
    }

    function sameWorkspaceSnapshot(left, right) {
        return sameWorkspaceEdit(left, right) &&
            workspaceRevision(left) === workspaceRevision(right);
    }

    function findLatestTabDraft(storage, prefix) {
        if (!storage || !prefix || typeof storage.getItem !== 'function' ||
            typeof storage.key !== 'function' || typeof storage.length !== 'number') return null;
        var latest = null;
        for (var index = 0; index < storage.length; index += 1) {
            var key = storage.key(index);
            if (!key || key.indexOf(prefix) !== 0) continue;
            try {
                var parsed = JSON.parse(storage.getItem(key));
                if (!hasWorkspaceData(parsed)) continue;
                var timestamp = Date.parse(parsed.savedAt || '') || 0;
                if (!latest || timestamp >= latest.timestamp) {
                    latest = { key: key, workspace: parsed, timestamp: timestamp };
                }
            } catch (_) {}
        }
        return latest;
    }

    var WORKSPACE_VERSION = 4;
    var LOCAL_STORAGE_SAFETY_BYTES = 4 * 1024 * 1024;
    var WORKSPACE_WARNING_BYTES = 2 * 1024 * 1024;
    var LOCAL_WORKSPACE_SAVE_DELAY_MS = 300;
    var COLLECTION_DEFAULT_PAGE_SIZE = 50;
    var COLLECTION_MAX_PAGE_SIZE = 100;
    var MAX_WORKSPACE_IMPORT_BYTES = 4 * 1024 * 1024;
    var MAX_SHARED_WORKSPACE_IMPORT_BYTES = 1024 * 1024;
    var WORKSPACE_ARRAY_LIMITS = {
        abcEntries: 5000,
        observationSessions: 1000,
        sessionNotes: 500,
        teamNotes: 500,
        sessionHistory: 1000,
        designPhases: 100,
        favorites: 100,
        dismissedAlerts: 5000,
        visitedPanels: 5000,
        targetBehaviors: 100,
        deletedAbcEntries: 250,
        auditLog: 1000,
        workflowDiagnostics: 1000
    };
    var MAX_TARGET_BEHAVIORS = 100;
    var MAX_DELETED_ABC_ENTRIES = 250;
    var MAX_AUDIT_EVENTS = 1000;
    var MAX_WORKFLOW_DIAGNOSTICS = 1000;
    var MAX_TOOL_STATE_BYTES = 512 * 1024;

    function paginateCollection(items, requestedPageIndex, requestedPageSize, options) {
        options = options || {};
        var collection = Array.isArray(items) ? items : [];
        var configuredMaximum = Math.floor(Number(options.maxPageSize));
        var maxPageSize = Number.isFinite(configuredMaximum) && configuredMaximum > 0
            ? configuredMaximum : COLLECTION_MAX_PAGE_SIZE;
        var configuredDefault = Math.floor(Number(options.defaultPageSize));
        var defaultPageSize = Number.isFinite(configuredDefault) && configuredDefault > 0
            ? Math.min(configuredDefault, maxPageSize)
            : Math.min(COLLECTION_DEFAULT_PAGE_SIZE, maxPageSize);
        var numericPageSize = Math.floor(Number(requestedPageSize));
        var pageSize = Number.isFinite(numericPageSize) && numericPageSize > 0
            ? Math.min(numericPageSize, maxPageSize) : defaultPageSize;
        var totalItems = collection.length;
        var pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
        var numericPageIndex = Math.floor(Number(requestedPageIndex));
        var pageIndex = Number.isFinite(numericPageIndex) && numericPageIndex >= 0
            ? Math.min(numericPageIndex, pageCount - 1) : 0;
        var startOffset = totalItems > 0 ? pageIndex * pageSize : 0;
        var endOffset = Math.min(startOffset + pageSize, totalItems);
        return {
            items: collection.slice(startOffset, endOffset),
            totalItems: totalItems,
            pageIndex: pageIndex,
            pageNumber: pageIndex + 1,
            pageSize: pageSize,
            pageCount: pageCount,
            startIndex: totalItems > 0 ? startOffset + 1 : 0,
            endIndex: endOffset,
            hasPrevious: pageIndex > 0,
            hasNext: pageIndex < pageCount - 1
        };
    }

    function boundedText(value, maxLength) {
        if (value == null) return '';
        var text = String(value).replace(/\u0000/g, '').trim();
        var limit = Math.max(0, Number(maxLength) || 0);
        return limit ? text.slice(0, limit) : text;
    }

    function normalizeStringArray(values, maximumItems, maximumLength) {
        if (!Array.isArray(values)) return [];
        var seen = Object.create(null);
        var result = [];
        values.slice(0, maximumItems || values.length).forEach(function (value) {
            var text = boundedText(value, maximumLength || 200);
            if (!text || seen[text]) return;
            seen[text] = true;
            result.push(text);
        });
        return result;
    }

    function normalizeToken(value) {
        var text = boundedText(value, 500).toLowerCase();
        if (text.normalize) text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
        return text.replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
    }

    function stableHash(value) {
        var text;
        try { text = typeof value === 'string' ? value : JSON.stringify(value); }
        catch (_) { text = String(value == null ? '' : value); }
        var hash = 2166136261;
        for (var index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
    }

    function canonicalBehaviorId(label) {
        var token = normalizeToken(label);
        var slug = token.replace(/\s+/g, '-').slice(0, 40) || 'unclassified';
        return 'behavior-' + slug + '-' + stableHash(token).slice(0, 6);
    }

    function normalizeIsoTimestamp(value) {
        if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return null;
        var date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }

    function normalizeTimezoneOffset(value) {
        var numeric = Number(value);
        return Number.isFinite(numeric) && numeric >= -840 && numeric <= 840 ? Math.round(numeric) : null;
    }

    function localDayKey(value, timezoneOffset) {
        var iso = normalizeIsoTimestamp(value);
        if (!iso) return null;
        var date = new Date(iso);
        var offset = normalizeTimezoneOffset(timezoneOffset);
        if (offset == null) {
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        }
        var shifted = new Date(date.getTime() - offset * 60000);
        return shifted.getUTCFullYear() + '-' + String(shifted.getUTCMonth() + 1).padStart(2, '0') + '-' + String(shifted.getUTCDate()).padStart(2, '0');
    }

    function parseLocalDateBoundary(value, endExclusive) {
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
        if (!match) return null;
        var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!Number.isFinite(date.getTime()) || date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
        if (endExclusive) date.setDate(date.getDate() + 1);
        return date;
    }

    function normalizeTargetBehavior(value, index) {
        var source = value && typeof value === 'object' && !Array.isArray(value) ? value : { label: value };
        var label = boundedText(source.label || source.name, 240);
        if (!label) return null;
        var id = boundedText(source.id, 120) || canonicalBehaviorId(label);
        return {
            id: id,
            label: label,
            operationalDefinition: boundedText(source.operationalDefinition || source.definition, 4000),
            aliases: normalizeStringArray(source.aliases, 50, 240),
            active: source.active !== false,
            measurement: boundedText(source.measurement, 120) || null,
            createdAt: normalizeIsoTimestamp(source.createdAt),
            updatedAt: normalizeIsoTimestamp(source.updatedAt),
            order: Number.isFinite(Number(source.order)) ? Number(source.order) : index
        };
    }

    function normalizeTargetBehaviors(values, entries) {
        var result = [];
        var seenIds = Object.create(null);
        var seenLabels = Object.create(null);
        function add(value) {
            if (result.length >= MAX_TARGET_BEHAVIORS) return;
            var normalized = normalizeTargetBehavior(value, result.length);
            if (!normalized) return;
            var key = normalizeToken(normalized.label);
            if (seenIds[normalized.id] || seenLabels[key]) return;
            seenIds[normalized.id] = true;
            seenLabels[key] = true;
            result.push(normalized);
        }
        (Array.isArray(values) ? values : []).slice(0, MAX_TARGET_BEHAVIORS).forEach(add);
        (Array.isArray(entries) ? entries : []).slice(0, 5000).forEach(function (entry) {
            if (!entry || typeof entry !== 'object') return;
            var label = boundedText(entry.behavior, 240);
            if (label) add({ id: boundedText(entry.behaviorId, 120) || canonicalBehaviorId(label), label: label });
        });
        return result;
    }

    function buildBehaviorLookup(targetBehaviors) {
        var byId = Object.create(null);
        var byToken = Object.create(null);
        (Array.isArray(targetBehaviors) ? targetBehaviors : []).forEach(function (behavior) {
            if (!behavior || !behavior.id) return;
            byId[behavior.id] = behavior;
            [behavior.label].concat(behavior.aliases || []).forEach(function (label) {
                var token = normalizeToken(label);
                if (token && !byToken[token]) byToken[token] = behavior;
            });
        });
        return { byId: byId, byToken: byToken };
    }

    function resolveCanonicalBehavior(value, targetBehaviors) {
        var entry = value && typeof value === 'object' ? value : { behavior: value };
        var label = boundedText(entry.behavior || entry.label, 240);
        var lookup = buildBehaviorLookup(targetBehaviors);
        var behavior = entry.behaviorId && lookup.byId[entry.behaviorId]
            ? lookup.byId[entry.behaviorId] : lookup.byToken[normalizeToken(label)];
        if (behavior) return { id: behavior.id, label: behavior.label, defined: true };
        return { id: boundedText(entry.behaviorId, 120) || canonicalBehaviorId(label), label: label || 'Unclassified', defined: false };
    }

    function normalizeIntensity(value) {
        if (value == null || value === '') return null;
        var numeric = Number(value);
        return Number.isFinite(numeric) && numeric >= 1 && numeric <= 5 ? numeric : null;
    }

    function normalizeDurationSeconds(value) {
        if (value == null || value === '') return null;
        var numeric = Number(value);
        return Number.isFinite(numeric) && numeric >= 0 && numeric <= 86400 ? numeric : null;
    }

    function sanitizeJsonValue(value, options, depth) {
        options = options || {};
        depth = depth || 0;
        if (depth > (options.maxDepth || 8)) return null;
        if (value == null || typeof value === 'boolean') return value;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (typeof value === 'string') return value.slice(0, options.maxStringLength || 20000);
        if (Array.isArray(value)) return value.slice(0, options.maxArrayLength || 1000).map(function (item) {
            return sanitizeJsonValue(item, options, depth + 1);
        });
        if (typeof value !== 'object') return null;
        var result = {};
        Object.keys(value).slice(0, options.maxObjectKeys || 500).forEach(function (key) {
            if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
            result[key] = sanitizeJsonValue(value[key], options, depth + 1);
        });
        if (options.maxBytes) {
            try { if (utf8ByteLength(JSON.stringify(result)) > options.maxBytes) return null; }
            catch (_) { return null; }
        }
        return result;
    }

    function sanitizeJsonObject(value, maxBytes) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        var normalized = sanitizeJsonValue(value, { maxBytes: maxBytes || 128 * 1024 });
        return normalized && typeof normalized === 'object' && !Array.isArray(normalized) ? normalized : {};
    }

    function normalizeAbcEntry(value, options) {
        options = options || {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, entry: null, issues: ['invalid-record'] };
        var issues = [];
        var antecedent = boundedText(value.antecedent, 4000);
        var behaviorText = boundedText(value.behavior, 4000);
        var consequence = boundedText(value.consequence, 4000);
        if (!antecedent) issues.push('missing-antecedent');
        if (!behaviorText) issues.push('missing-behavior');
        if (!consequence) issues.push('missing-consequence');
        var occurredAt = normalizeIsoTimestamp(value.occurredAt || value.timestamp || value.date);
        if (!occurredAt) issues.push('invalid-timestamp');
        var intensity = normalizeIntensity(value.intensity);
        if (value.intensity != null && value.intensity !== '' && intensity == null) issues.push('invalid-intensity');
        if (intensity == null) issues.push('missing-intensity');
        var timezoneOffset = normalizeTimezoneOffset(value.timezoneOffset);
        var behavior = resolveCanonicalBehavior({ behavior: behaviorText, behaviorId: value.behaviorId }, options.targetBehaviors);
        var seed = [occurredAt || '', antecedent, behaviorText, consequence, options.index || 0].join('|');
        return {
            ok: true,
            issues: issues,
            entry: {
                id: boundedText(value.id, 160) || 'abc-' + stableHash(seed),
                timestamp: occurredAt,
                occurredAt: occurredAt,
                recordedAt: normalizeIsoTimestamp(value.recordedAt) || occurredAt,
                timezoneOffset: timezoneOffset,
                localDate: occurredAt ? localDayKey(occurredAt, timezoneOffset) : null,
                antecedent: antecedent,
                antecedentId: boundedText(value.antecedentId, 120) || (antecedent ? 'antecedent-' + stableHash(normalizeToken(antecedent)) : null),
                behavior: behaviorText,
                behaviorId: behavior.id,
                consequence: consequence,
                consequenceId: boundedText(value.consequenceId, 120) || (consequence ? 'consequence-' + stableHash(normalizeToken(consequence)) : null),
                setting: boundedText(value.setting, 2000),
                intensity: intensity,
                duration: normalizeDurationSeconds(value.duration),
                phase: boundedText(value.phase, 120) || null,
                notes: boundedText(value.notes, 10000),
                observer: boundedText(value.observer, 240),
                source: boundedText(value.source, 80).toLowerCase() || 'unknown',
                observationSessionId: boundedText(value.observationSessionId, 160) || null,
                student: boundedText(value.student, 240) || null,
                function: boundedText(value.function, 120) || null,
                tags: normalizeStringArray(value.tags, 50, 160),
                metadata: sanitizeJsonObject(value.metadata, 32 * 1024)
            }
        };
    }

    function normalizeAbcEntries(values, options) {
        var items = [];
        var issueCounts = Object.create(null);
        var dropped = 0;
        (Array.isArray(values) ? values : []).slice(0, WORKSPACE_ARRAY_LIMITS.abcEntries).forEach(function (value, index) {
            var result = normalizeAbcEntry(value, Object.assign({}, options || {}, { index: index }));
            if (!result.ok || !result.entry) { dropped += 1; return; }
            result.issues.forEach(function (issue) { issueCounts[issue] = (issueCounts[issue] || 0) + 1; });
            items.push(result.entry);
        });
        return { items: items, report: { inputCount: Array.isArray(values) ? values.length : 0, outputCount: items.length, droppedCount: dropped, issueCounts: issueCounts } };
    }

    function normalizeObservationSession(value, options) {
        options = options || {};
        if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, session: null, issues: ['invalid-record'] };
        var issues = [];
        var occurredAt = normalizeIsoTimestamp(value.occurredAt || value.timestamp || value.date);
        if (!occurredAt) issues.push('invalid-timestamp');
        var timezoneOffset = normalizeTimezoneOffset(value.timezoneOffset);
        var behavior = resolveCanonicalBehavior({ behavior: value.behavior || value.targetBehavior, behaviorId: value.behaviorId }, options.targetBehaviors);
        var duration = normalizeDurationSeconds(value.duration);
        if (duration == null) issues.push('missing-duration');
        var seed = [occurredAt || '', value.method || '', duration || '', options.index || 0].join('|');
        return {
            ok: true,
            issues: issues,
            session: {
                id: boundedText(value.id, 160) || 'obs-' + stableHash(seed),
                timestamp: occurredAt,
                occurredAt: occurredAt,
                recordedAt: normalizeIsoTimestamp(value.recordedAt) || occurredAt,
                timezoneOffset: timezoneOffset,
                localDate: occurredAt ? localDayKey(occurredAt, timezoneOffset) : null,
                method: boundedText(value.method, 80).toLowerCase() || 'unknown',
                duration: duration,
                behavior: boundedText(value.behavior || value.targetBehavior, 4000),
                behaviorId: behavior.id,
                phase: boundedText(value.phase, 120) || null,
                observer: boundedText(value.observer, 240),
                source: boundedText(value.source, 80).toLowerCase() || 'unknown',
                notes: boundedText(value.notes, 10000),
                data: sanitizeJsonObject(value.data, 128 * 1024)
            }
        };
    }

    function normalizeObservationSessions(values, options) {
        var items = [];
        var issueCounts = Object.create(null);
        var dropped = 0;
        (Array.isArray(values) ? values : []).slice(0, WORKSPACE_ARRAY_LIMITS.observationSessions).forEach(function (value, index) {
            var result = normalizeObservationSession(value, Object.assign({}, options || {}, { index: index }));
            if (!result.ok || !result.session) { dropped += 1; return; }
            result.issues.forEach(function (issue) { issueCounts[issue] = (issueCounts[issue] || 0) + 1; });
            items.push(result.session);
        });
        return { items: items, report: { inputCount: Array.isArray(values) ? values.length : 0, outputCount: items.length, droppedCount: dropped, issueCounts: issueCounts } };
    }

    function normalizeToolState(value) {
        return sanitizeJsonObject(value, MAX_TOOL_STATE_BYTES);
    }

    function normalizeDeletedAbcEntries(values, targetBehaviors) {
        var result = [];
        (Array.isArray(values) ? values : []).slice(0, MAX_DELETED_ABC_ENTRIES).forEach(function (item, index) {
            var source = item && item.entry ? item : { entry: item };
            var normalized = normalizeAbcEntry(source.entry, { targetBehaviors: targetBehaviors, index: index });
            if (!normalized.ok || !normalized.entry) return;
            result.push({
                entry: normalized.entry,
                deletedAt: normalizeIsoTimestamp(source.deletedAt) || normalized.entry.recordedAt,
                deletedBy: boundedText(source.deletedBy, 240),
                reason: boundedText(source.reason, 500),
                auditId: boundedText(source.auditId, 160) || null
            });
        });
        return result;
    }

    function normalizeAuditLog(values) {
        var result = [];
        (Array.isArray(values) ? values : []).slice(0, MAX_AUDIT_EVENTS).forEach(function (event, index) {
            if (!event || typeof event !== 'object' || Array.isArray(event)) return;
            var timestamp = normalizeIsoTimestamp(event.timestamp);
            var action = boundedText(event.action, 80);
            if (!timestamp || !action) return;
            result.push({
                id: boundedText(event.id, 160) || 'audit-' + stableHash(timestamp + '|' + action + '|' + index),
                timestamp: timestamp,
                action: action,
                entityType: boundedText(event.entityType, 80) || 'workspace',
                entityId: boundedText(event.entityId, 160) || null,
                actor: boundedText(event.actor, 240),
                summary: boundedText(event.summary, 1000),
                metadata: sanitizeJsonObject(event.metadata, 16 * 1024)
            });
        });
        return result;
    }

    function normalizeWorkflowDiagnostics(values) {
        var result = [];
        (Array.isArray(values) ? values : []).slice(0, MAX_WORKFLOW_DIAGNOSTICS).forEach(function (event, index) {
            if (!event || typeof event !== 'object' || Array.isArray(event)) return;
            var timestamp = normalizeIsoTimestamp(event.timestamp);
            var action = boundedText(event.action, 80);
            if (!timestamp || !action) return;
            result.push({
                id: boundedText(event.id, 160) || 'diagnostic-' + stableHash(timestamp + '|' + action + '|' + index),
                timestamp: timestamp,
                action: action,
                toolId: boundedText(event.toolId, 120) || null,
                durationMs: Number.isFinite(Number(event.durationMs)) && Number(event.durationMs) >= 0 ? Math.round(Number(event.durationMs)) : null,
                outcome: boundedText(event.outcome, 80) || null
            });
        });
        return result;
    }

    function summarizeIntensity(entries) {
        var distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        var sum = 0;
        var ratedCount = 0;
        var totalCount = Array.isArray(entries) ? entries.length : 0;
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            var value = normalizeIntensity(entry && entry.intensity);
            if (value == null) return;
            sum += value;
            ratedCount += 1;
            distribution[value] += 1;
        });
        return {
            mean: ratedCount ? sum / ratedCount : null,
            sum: sum,
            ratedCount: ratedCount,
            missingCount: totalCount - ratedCount,
            totalCount: totalCount,
            distribution: distribution
        };
    }

    function groupByCanonicalBehavior(entries, targetBehaviors) {
        var groups = Object.create(null);
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            var behavior = resolveCanonicalBehavior(entry, targetBehaviors);
            if (!groups[behavior.id]) groups[behavior.id] = { id: behavior.id, label: behavior.label, defined: behavior.defined, count: 0, entries: [] };
            groups[behavior.id].count += 1;
            groups[behavior.id].entries.push(entry);
        });
        return Object.keys(groups).map(function (id) {
            var group = groups[id];
            group.intensity = summarizeIntensity(group.entries);
            return group;
        }).sort(function (left, right) { return right.count - left.count || left.label.localeCompare(right.label); });
    }

    function groupByLocalDay(entries) {
        var groups = Object.create(null);
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            var key = entry && entry.localDate || localDayKey(entry && (entry.occurredAt || entry.timestamp), entry && entry.timezoneOffset);
            if (!key) return;
            if (!groups[key]) groups[key] = [];
            groups[key].push(entry);
        });
        return Object.keys(groups).sort().map(function (date) {
            return { date: date, count: groups[date].length, entries: groups[date], intensity: summarizeIntensity(groups[date]) };
        });
    }

    function filterByDateRange(items, options) {
        options = options || {};
        var from = options.from instanceof Date ? options.from : parseLocalDateBoundary(options.from, false);
        var toExclusive = options.toExclusive instanceof Date ? options.toExclusive : parseLocalDateBoundary(options.to, true);
        return (Array.isArray(items) ? items : []).filter(function (item) {
            var iso = normalizeIsoTimestamp(item && (item.occurredAt || item.timestamp || item.date));
            if (!iso) return false;
            var date = new Date(iso);
            return (!from || date >= from) && (!toExclusive || date < toExclusive);
        });
    }

    function summarizeExposure(observationSessions, options) {
        options = options || {};
        var seconds = 0;
        var sessionCount = 0;
        (Array.isArray(observationSessions) ? observationSessions : []).forEach(function (session) {
            if (options.phase && session && session.phase !== options.phase) return;
            if (options.behaviorId && session && session.behaviorId && session.behaviorId !== options.behaviorId) return;
            var duration = normalizeDurationSeconds(session && session.duration);
            if (duration == null || duration <= 0) return;
            seconds += duration;
            sessionCount += 1;
        });
        return { seconds: seconds, minutes: seconds / 60, hours: seconds / 3600, sessionCount: sessionCount };
    }

    function calculateIncidentRate(entries, observationSessions, options) {
        options = options || {};
        var incidents = (Array.isArray(entries) ? entries : []).filter(function (entry) {
            if (options.phase && entry && entry.phase !== options.phase) return false;
            if (options.behaviorId && entry && entry.behaviorId !== options.behaviorId) return false;
            return true;
        }).length;
        var exposure = summarizeExposure(observationSessions, options);
        return {
            incidents: incidents,
            exposure: exposure,
            perObservedHour: exposure.hours > 0 ? incidents / exposure.hours : null,
            denominatorAvailable: exposure.hours > 0
        };
    }

    function summarizePhases(entries, observationSessions) {
        var phases = Object.create(null);
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            var phase = boundedText(entry && entry.phase, 120) || 'Unassigned';
            if (!phases[phase]) phases[phase] = [];
            phases[phase].push(entry);
        });
        return Object.keys(phases).map(function (phase) {
            var rate = calculateIncidentRate(phases[phase], observationSessions, { phase: phase === 'Unassigned' ? null : phase });
            return { phase: phase, count: phases[phase].length, intensity: summarizeIntensity(phases[phase]), rate: rate };
        }).sort(function (left, right) { return right.count - left.count; });
    }

    function inspectAbcData(entries, targetBehaviors, observationSessions) {
        var normalized = normalizeAbcEntries(entries, { targetBehaviors: targetBehaviors });
        var issueCounts = normalized.report.issueCounts;
        var undefinedBehaviors = groupByCanonicalBehavior(normalized.items, targetBehaviors).filter(function (group) { return !group.defined; });
        var exposure = summarizeExposure(observationSessions);
        return {
            recordCount: normalized.items.length,
            droppedCount: normalized.report.droppedCount,
            issueCounts: issueCounts,
            missingIntensityCount: issueCounts['missing-intensity'] || 0,
            invalidTimestampCount: issueCounts['invalid-timestamp'] || 0,
            incompleteAbcCount: Math.max(issueCounts['missing-antecedent'] || 0, issueCounts['missing-behavior'] || 0, issueCounts['missing-consequence'] || 0),
            undefinedBehaviorCount: undefinedBehaviors.length,
            undefinedBehaviors: undefinedBehaviors.slice(0, 20).map(function (group) { return { id: group.id, label: group.label, count: group.count }; }),
            exposure: exposure,
            denominatorAvailable: exposure.hours > 0
        };
    }

    function dataFingerprint(entries) {
        var relevant = (Array.isArray(entries) ? entries : []).map(function (entry) {
            return [entry && entry.id, entry && (entry.occurredAt || entry.timestamp), entry && entry.antecedentId, entry && entry.behaviorId, entry && entry.consequenceId, entry && normalizeIntensity(entry.intensity), entry && entry.phase];
        }).sort(function (left, right) { return String(left[0] || '').localeCompare(String(right[0] || '')); });
        return 'bl-data-' + stableHash(relevant);
    }

    function selectStratifiedEntries(entries, maximum) {
        var sorted = (Array.isArray(entries) ? entries : []).slice().sort(function (left, right) {
            return (Date.parse(left && (left.occurredAt || left.timestamp) || '') || 0) - (Date.parse(right && (right.occurredAt || right.timestamp) || '') || 0);
        });
        var limit = Math.max(1, Math.floor(Number(maximum) || 20));
        if (sorted.length <= limit) return { entries: sorted, strategy: 'complete', totalCount: sorted.length, sampleCount: sorted.length };
        var selected = [];
        var seen = Object.create(null);
        for (var index = 0; index < limit; index += 1) {
            var position = Math.round(index * (sorted.length - 1) / (limit - 1));
            var entry = sorted[position];
            var key = entry && entry.id || String(position);
            if (seen[key]) continue;
            seen[key] = true;
            selected.push(entry);
        }
        return { entries: selected, strategy: 'stratified-across-date-range', totalCount: sorted.length, sampleCount: selected.length };
    }

    function createAnalysisProvenance(entries, sample, now) {
        var values = Array.isArray(entries) ? entries : [];
        var timestamps = values.map(function (entry) { return normalizeIsoTimestamp(entry && (entry.occurredAt || entry.timestamp)); }).filter(Boolean).sort();
        var selected = sample && Array.isArray(sample.entries) ? sample : selectStratifiedEntries(values, 20);
        return {
            generatedAt: normalizeIsoTimestamp(now) || new Date().toISOString(),
            sourceFingerprint: dataFingerprint(values),
            totalEntries: values.length,
            sampleCount: selected.sampleCount,
            sampleStrategy: selected.strategy,
            dateFrom: timestamps.length ? timestamps[0] : null,
            dateTo: timestamps.length ? timestamps[timestamps.length - 1] : null,
            sampledEntryIds: selected.entries.map(function (entry) { return entry && entry.id; }).filter(Boolean)
        };
    }

    function isAnalysisStale(analysis, entries) {
        return !!(analysis && analysis.provenance && analysis.provenance.sourceFingerprint && analysis.provenance.sourceFingerprint !== dataFingerprint(entries));
    }

    function createAuditEvent(action, options) {
        options = options || {};
        var timestamp = normalizeIsoTimestamp(options.timestamp) || new Date().toISOString();
        return {
            id: boundedText(options.id, 160) || 'audit-' + stableHash(timestamp + '|' + action + '|' + (options.entityId || '')),
            timestamp: timestamp,
            action: boundedText(action, 80),
            entityType: boundedText(options.entityType, 80) || 'workspace',
            entityId: boundedText(options.entityId, 160) || null,
            actor: boundedText(options.actor, 240),
            summary: boundedText(options.summary, 1000),
            metadata: sanitizeJsonObject(options.metadata, 16 * 1024)
        };
    }

    function appendBounded(items, value, maximum) {
        return [value].concat(Array.isArray(items) ? items : []).slice(0, Math.max(1, maximum || 1000));
    }

    function softDeleteAbcEntries(entries, deletedEntries, ids, options) {
        options = options || {};
        var idSet = Object.create(null);
        (Array.isArray(ids) ? ids : [ids]).forEach(function (id) { if (id != null) idSet[String(id)] = true; });
        var kept = [];
        var removed = [];
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            if (!entry || !idSet[String(entry.id)]) { kept.push(entry); return; }
            removed.push({ entry: entry, deletedAt: normalizeIsoTimestamp(options.deletedAt) || new Date().toISOString(), deletedBy: boundedText(options.deletedBy, 240), reason: boundedText(options.reason, 500), auditId: boundedText(options.auditId, 160) || null });
        });
        return { entries: kept, deletedEntries: removed.concat(Array.isArray(deletedEntries) ? deletedEntries : []).slice(0, MAX_DELETED_ABC_ENTRIES), removed: removed };
    }

    function restoreDeletedAbcEntry(entries, deletedEntries, id) {
        var restored = null;
        var remaining = [];
        (Array.isArray(deletedEntries) ? deletedEntries : []).forEach(function (item) {
            if (!restored && item && item.entry && String(item.entry.id) === String(id)) restored = item.entry;
            else remaining.push(item);
        });
        if (!restored) return { entries: Array.isArray(entries) ? entries : [], deletedEntries: remaining, restored: null };
        var withoutDuplicate = (Array.isArray(entries) ? entries : []).filter(function (entry) { return !entry || String(entry.id) !== String(restored.id); });
        return { entries: [restored].concat(withoutDuplicate), deletedEntries: remaining, restored: restored };
    }

    function utf8ByteLength(value) {
        var text = String(value == null ? '' : value);
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
        var bytes = 0;
        for (var index = 0; index < text.length; index += 1) {
            var code = text.charCodeAt(index);
            if (code < 0x80) bytes += 1;
            else if (code < 0x800) bytes += 2;
            else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < text.length) {
                index += 1;
                bytes += 4;
            } else bytes += 3;
        }
        return bytes;
    }

    function localStorageByteLength(value) {
        return String(value == null ? '' : value).length * 2;
    }

    function formatByteSize(bytes) {
        var value = Number(bytes) || 0;
        if (value < 1024) return Math.round(value) + ' B';
        if (value < 1024 * 1024) return (value / 1024).toFixed(value < 10 * 1024 ? 1 : 0) + ' KB';
        return (value / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function createWorkspacePersistenceScheduler(options) {
        options = options || {};
        if (typeof options.persist !== 'function') throw new Error('A workspace persistence callback is required');
        var delayMs = Number.isFinite(Number(options.delayMs)) && Number(options.delayMs) >= 0
            ? Number(options.delayMs) : LOCAL_WORKSPACE_SAVE_DELAY_MS;
        var setTimeoutFn = typeof options.setTimeout === 'function' ? options.setTimeout : setTimeout;
        var clearTimeoutFn = typeof options.clearTimeout === 'function' ? options.clearTimeout : clearTimeout;
        var keyForValue = typeof options.keyForValue === 'function' ? options.keyForValue : function () { return 'workspace'; };
        var onError = typeof options.onError === 'function' ? options.onError : null;
        var pendingByKey = new Map();
        var timerHandle = null;

        function clearScheduledTimer() {
            if (timerHandle == null) return;
            clearTimeoutFn(timerHandle);
            timerHandle = null;
        }
        function flush(context) {
            clearScheduledTimer();
            var flushContext = context && typeof context === 'object' ? context : {};
            var results = [];
            var errors = [];
            Array.from(pendingByKey.entries()).forEach(function (entry) {
                var key = entry[0];
                var value = entry[1];
                try {
                    var result = options.persist(value, flushContext);
                    pendingByKey.delete(key);
                    results.push({ key: key, value: result });
                } catch (error) {
                    errors.push({ key: key, error: error });
                    if (onError) { try { onError(error, value, flushContext); } catch (_) {} }
                }
            });
            return { ok: errors.length === 0, flushedCount: results.length, failedCount: errors.length,
                pendingCount: pendingByKey.size, results: results, errors: errors };
        }
        function schedule(value) {
            var rawKey = keyForValue(value);
            if (rawKey == null || rawKey === '') throw new Error('A workspace persistence key is required');
            var key = String(rawKey);
            pendingByKey.set(key, value);
            clearScheduledTimer();
            timerHandle = setTimeoutFn(function () { timerHandle = null; flush({ reason: 'delay' }); }, delayMs);
            return { key: key, pendingCount: pendingByKey.size };
        }
        function cancel(key) {
            if (arguments.length === 0) pendingByKey.clear();
            else pendingByKey.delete(String(key));
            if (pendingByKey.size === 0) clearScheduledTimer();
            return pendingByKey.size;
        }
        return Object.freeze({ schedule: schedule, flush: flush, cancel: cancel,
            hasPending: function () { return pendingByKey.size > 0; },
            pendingCount: function () { return pendingByKey.size; },
            pendingValues: function () { return Array.from(pendingByKey.values()); } });
    }

    function createLocalWorkspaceWritePlan(options) {
        options = options || {};
        var workspace = options.workspace && typeof options.workspace === 'object'
            ? options.workspace : {};
        var operations = [];
        var addSet = function (key, value) {
            if (key) operations.push({ key: key, value: value, remove: false });
        };
        var dirtyKey = options.dirtyKey;
        var suppressDirtyMark = !!options.suppressDirtyMark;
        if (!suppressDirtyMark && dirtyKey) {
            var dirtyMarker = {
                pending: true,
                revision: workspaceRevision(workspace),
                savedAt: workspace.savedAt || null
            };
            if (typeof workspace.snapshotId === 'string' && workspace.snapshotId) {
                dirtyMarker.snapshotId = workspace.snapshotId;
            }
            addSet(dirtyKey, JSON.stringify(dirtyMarker));
        }
        var workspaceJson = JSON.stringify(workspace);
        addSet(options.workspaceKey, workspaceJson);
        if (options.abcKey) addSet(options.abcKey, JSON.stringify(options.abcEntries || []));
        if (options.observationKey) addSet(options.observationKey, JSON.stringify(options.observationSessions || []));
        if (suppressDirtyMark && dirtyKey) operations.push({ key: dirtyKey, value: null, remove: true });
        return {
            workspace: workspace,
            workspaceBytes: utf8ByteLength(workspaceJson),
            operations: operations
        };
    }

    function assessLocalStorageWrite(storage, plan, options) {
        options = options || {};
        if (!storage || !plan || !Array.isArray(plan.operations) ||
            typeof storage.getItem !== 'function' || typeof storage.key !== 'function' ||
            typeof storage.length !== 'number') return null;
        var safetyBytes = Number(options.safetyBytes) || LOCAL_STORAGE_SAFETY_BYTES;
        var warningBytes = Number(options.warningBytes) || Math.floor(safetyBytes * 0.8);
        var workspaceWarningBytes = Number(options.workspaceWarningBytes) || WORKSPACE_WARNING_BYTES;
        var values = Object.create(null);
        var projectedBytes = 0;
        try {
            for (var index = 0; index < storage.length; index += 1) {
                var key = storage.key(index);
                if (key == null) continue;
                var value = storage.getItem(key);
                values[key] = value;
                projectedBytes += localStorageByteLength(key) + localStorageByteLength(value);
            }
            plan.operations.forEach(function (operation) {
                if (!operation || !operation.key) return;
                if (Object.prototype.hasOwnProperty.call(values, operation.key)) {
                    projectedBytes -= localStorageByteLength(operation.key) + localStorageByteLength(values[operation.key]);
                    delete values[operation.key];
                }
                if (!operation.remove) {
                    values[operation.key] = operation.value;
                    projectedBytes += localStorageByteLength(operation.key) + localStorageByteLength(operation.value);
                }
            });
        } catch (_) {
            return null;
        }
        projectedBytes = Math.max(0, projectedBytes);
        var level = null;
        var reason = null;
        if (projectedBytes >= safetyBytes) {
            level = 'critical';
            reason = 'projected-total';
        } else if (projectedBytes >= warningBytes) {
            level = 'warning';
            reason = 'projected-total';
        } else if (plan.workspaceBytes >= workspaceWarningBytes) {
            level = 'warning';
            reason = 'large-workspace';
        }
        return {
            level: level,
            reason: reason,
            projectedBytes: projectedBytes,
            safetyBytes: safetyBytes,
            workspaceBytes: plan.workspaceBytes,
            usageRatio: safetyBytes > 0 ? projectedBytes / safetyBytes : 0
        };
    }

    function validateWorkspaceImport(data, options) {
        options = options || {};
        var maxBytes = Number(options.maxBytes) || MAX_WORKSPACE_IMPORT_BYTES;
        var sourceBytes = Number(options.sourceBytes);
        var errors = [];
        var warnings = [];
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { ok: false, error: 'The file must contain one BehaviorLens workspace object.', errors: ['invalid-object'], warnings: [] };
        }
        if (!Number.isFinite(sourceBytes)) {
            try { sourceBytes = utf8ByteLength(JSON.stringify(data)); }
            catch (_) { sourceBytes = maxBytes + 1; }
        }
        if (sourceBytes > maxBytes) errors.push('Workspace file exceeds the ' + formatByteSize(maxBytes) + ' import limit.');

        var recognized = false;
        Object.keys(WORKSPACE_ARRAY_LIMITS).forEach(function (field) {
            if (!Object.prototype.hasOwnProperty.call(data, field)) return;
            recognized = true;
            if (!Array.isArray(data[field])) {
                errors.push(field + ' must be an array.');
            } else if (data[field].length > WORKSPACE_ARRAY_LIMITS[field]) {
                errors.push(field + ' exceeds the limit of ' + WORKSPACE_ARRAY_LIMITS[field] + ' items.');
            }
        });
        ['studentProfile', 'activityRegistry', 'workflowSubSteps'].forEach(function (field) {
            if (!Object.prototype.hasOwnProperty.call(data, field)) return;
            recognized = true;
            if (!data[field] || typeof data[field] !== 'object' || Array.isArray(data[field])) {
                errors.push(field + ' must be an object.');
            }
        });
        if (Object.prototype.hasOwnProperty.call(data, 'student')) {
            if (typeof data.student !== 'string' || data.student.length > 200) {
                errors.push('student must be a name no longer than 200 characters.');
            }
        }
        if (!recognized) errors.push('No recognized BehaviorLens workspace data was found.');
        if (!errors.length && sourceBytes >= Math.floor(maxBytes * 0.75)) {
            warnings.push('This workspace is close to the safe browser import limit.');
        }
        return {
            ok: errors.length === 0,
            error: errors.length ? errors[0] : null,
            errors: errors,
            warnings: warnings,
            sourceBytes: sourceBytes,
            maxBytes: maxBytes
        };
    }

    function validateSharedWorkspaceImport(data, options) {
        options = options || {};
        var maxBytes = Number(options.maxBytes) || MAX_SHARED_WORKSPACE_IMPORT_BYTES;
        var sourceBytes = Number(options.sourceBytes);
        var errors = [];
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { ok: false, error: 'The file must contain one BehaviorLens shared snapshot.', errors: ['invalid-object'] };
        }
        if (!Number.isFinite(sourceBytes)) {
            try { sourceBytes = utf8ByteLength(JSON.stringify(data)); }
            catch (_) { sourceBytes = maxBytes + 1; }
        }
        if (sourceBytes > maxBytes) errors.push('Shared snapshot exceeds the ' + formatByteSize(maxBytes) + ' import limit.');
        if (!['bcba', 'teacher', 'parent'].includes(data.role)) {
            errors.push('Shared snapshot role must be bcba, teacher, or parent.');
        }
        if (typeof data.student !== 'string' || !data.student.trim() || data.student.length > 200) {
            errors.push('Shared snapshot must include a student name no longer than 200 characters.');
        }
        var arrayLimits = {
            abcEntries: 5000,
            observationSessions: 1000,
            sessionHistory: 1000,
            strengths: 100,
            strategies: 100,
            topBehaviors: 100
        };
        var recognized = false;
        Object.keys(arrayLimits).forEach(function (field) {
            if (!Object.prototype.hasOwnProperty.call(data, field)) return;
            recognized = true;
            if (!Array.isArray(data[field])) errors.push(field + ' must be an array.');
            else if (data[field].length > arrayLimits[field]) errors.push(field + ' exceeds the limit of ' + arrayLimits[field] + ' items.');
        });
        ['profile', 'summary'].forEach(function (field) {
            if (!Object.prototype.hasOwnProperty.call(data, field)) return;
            recognized = true;
            if (!data[field] || typeof data[field] !== 'object' || Array.isArray(data[field])) {
                errors.push(field + ' must be an object.');
            }
        });
        ['aiAnalysis', 'progress', 'totalEntries', 'avgIntensity'].forEach(function (field) {
            if (Object.prototype.hasOwnProperty.call(data, field)) recognized = true;
        });
        if (!recognized) errors.push('No recognized shared BehaviorLens data was found.');
        return {
            ok: errors.length === 0,
            error: errors.length ? errors[0] : null,
            errors: errors,
            sourceBytes: sourceBytes,
            maxBytes: maxBytes
        };
    }

    function persistLocalWorkspace(options) {
        options = options || {};
        var storage = options.storage;
        if (!storage || typeof storage.setItem !== 'function') {
            throw new Error('Browser workspace storage is unavailable');
        }
        var plan = createLocalWorkspaceWritePlan(options);
        var capacity = assessLocalStorageWrite(storage, plan, options.capacityOptions);
        // The plan preserves crash consistency: establish a dirty marker first,
        // replace the authoritative workspace next, then clean only at the end.
        plan.operations.forEach(function (operation) {
            if (operation.remove) {
                if (typeof storage.removeItem === 'function') storage.removeItem(operation.key);
            } else {
                storage.setItem(operation.key, operation.value);
            }
        });
        return {
            workspace: plan.workspace,
            workspaceBytes: plan.workspaceBytes,
            capacity: capacity
        };
    }

    function acknowledgeCloudWorkspace(options) {
        options = options || {};
        var storage = options.storage;
        if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
            throw new Error('Browser workspace storage is unavailable');
        }
        if (!options.workspaceKey) throw new Error('A local workspace key is required');
        var acknowledgedSource = options.workspace && typeof options.workspace === 'object' ? options.workspace : {};
        var currentWorkspace = null;
        var currentRaw = storage.getItem(options.workspaceKey);
        if (currentRaw) {
            currentWorkspace = JSON.parse(currentRaw);
            if (!currentWorkspace || typeof currentWorkspace !== 'object' || Array.isArray(currentWorkspace)) {
                throw new Error('The saved browser workspace is invalid');
            }
        }
        var dirtyMarker = options.dirtyKey ? parseDirtyMarker(storage.getItem(options.dirtyKey)) : null;
        var acknowledgedRevision = normalizeRevision(options.revision);
        var staleCurrent = !!(currentWorkspace && !sameWorkspaceEdit(currentWorkspace, acknowledgedSource));
        var staleDirty = !!(dirtyMarker && !sameWorkspaceEdit(dirtyMarker, acknowledgedSource));
        var newerLocalRevision = !!(currentWorkspace && workspaceRevision(currentWorkspace) > acknowledgedRevision);
        if (staleCurrent || staleDirty || newerLocalRevision) {
            return { applied: false, stale: true, currentWorkspace: currentWorkspace,
                dirtyMarker: dirtyMarker, revision: acknowledgedRevision };
        }
        var metadata = { revision: acknowledgedRevision };
        if (typeof options.updatedAt === 'string') metadata.updatedAt = options.updatedAt;
        var acknowledgedWorkspace = Object.assign({}, acknowledgedSource, metadata);
        var persistenceResult = persistLocalWorkspace({ storage: storage, workspaceKey: options.workspaceKey,
            dirtyKey: options.dirtyKey, workspace: acknowledgedWorkspace, suppressDirtyMark: true,
            capacityOptions: options.capacityOptions });
        return { applied: true, stale: false, workspace: acknowledgedWorkspace,
            revision: acknowledgedRevision, capacity: persistenceResult.capacity };
    }

    function normalizeRevision(value) {
        var numeric = Number(value);
        return Number.isInteger(numeric) && numeric >= 0 ? numeric : 0;
    }

    function workspaceRevision(data) {
        return normalizeRevision(data && data.revision);
    }

    async function commitCloudWorkspace(options) {
        options = options || {};
        if (typeof options.runTransaction !== 'function') {
            var unavailable = new Error('Firestore transactions are unavailable');
            unavailable.code = 'behavior-lens/transaction-unavailable';
            throw unavailable;
        }
        if (!options.docRef) throw new Error('A Behavior Lens cloud document reference is required');
        var expectedRevision = normalizeRevision(options.expectedRevision);
        return options.runTransaction(options.firestore, async function (transaction) {
            if (!transaction || typeof transaction.get !== 'function' || typeof transaction.set !== 'function') {
                throw new Error('Firestore transaction adapter is invalid');
            }
            var remoteSnap = await transaction.get(options.docRef);
            var exists = !!(remoteSnap && typeof remoteSnap.exists === 'function' && remoteSnap.exists());
            var remote = exists && typeof remoteSnap.data === 'function' ? remoteSnap.data() : null;
            var remoteRevision = workspaceRevision(remote);
            if (!options.force && !options.isRoster && remoteRevision !== expectedRevision) {
                return {
                    ok: false,
                    conflict: {
                        expectedRevision: expectedRevision,
                        remoteRevision: remoteRevision,
                        remoteSavedAt: remote && (remote.updatedAt || remote.savedAt) || null
                    }
                };
            }
            var nextRevision = remoteRevision + 1;
            var updatedAt = typeof options.now === 'string' ? options.now : new Date().toISOString();
            var payload = Object.assign({}, options.data || {}, {
                revision: nextRevision,
                updatedAt: updatedAt,
                _uid: options.userId
            });
            transaction.set(options.docRef, payload, { merge: true });
            return { ok: true, revision: nextRevision, updatedAt: updatedAt, payload: payload };
        });
    }

    async function loadStudentWorkspace(options) {
        options = options || {};
        var guard = options.guard;
        var token = options.token;
        var isCurrent = function () { return !!guard && guard.isCurrent(token); };
        if (!isCurrent()) return { source: 'stale', stale: true };

        var storage = options.storage;
        var parsedWorkspace = null;
        var dirtyMarker = null;
        var localReadError = null;
        if (storage && typeof storage.getItem === 'function') {
            try {
                var savedWorkspace = storage.getItem(options.workspaceKey);
                if (savedWorkspace) {
                    var parsed = JSON.parse(savedWorkspace);
                    if (parsed && typeof parsed === 'object') parsedWorkspace = parsed;
                }
                dirtyMarker = options.dirtyKey ? parseDirtyMarker(storage.getItem(options.dirtyKey)) : null;
            } catch (error) {
                localReadError = error;
            }
        }
        if (!isCurrent()) return { source: 'stale', stale: true };

        var tabDraft = options.tabDraftPrefix
            ? findLatestTabDraft(storage, options.tabDraftPrefix) : null;
        if (tabDraft && parsedWorkspace && !sameWorkspaceSnapshot(tabDraft.workspace, parsedWorkspace)) {
            return {
                source: 'local-tab-conflict',
                workspace: tabDraft.workspace,
                otherWorkspace: parsedWorkspace,
                pendingLocalResolution: true,
                tabDraftKey: tabDraft.key,
                conflict: {
                    currentSavedAt: tabDraft.workspace.savedAt || null,
                    otherSavedAt: parsedWorkspace.savedAt || null
                },
                error: localReadError
            };
        }

        // A dirty local workspace represents edits that were never confirmed by
        // a successful cloud transaction. Preserve it across reloads and compare
        // revisions before allowing a cloud-first hydration to replace it.
        if (dirtyMarker && parsedWorkspace) {
            var dirtyCloudData = null;
            if (options.shouldLoadCloud && typeof options.loadFromCloud === 'function') {
                try {
                    dirtyCloudData = await options.loadFromCloud(options.loadKey);
                } catch (error) {
                    dirtyCloudData = null;
                }
            }
            if (!isCurrent()) return { source: 'stale', stale: true };
            var localRevision = workspaceRevision(parsedWorkspace);
            if (hasWorkspaceData(dirtyCloudData)) {
                var remoteRevision = workspaceRevision(dirtyCloudData);
                if (remoteRevision !== localRevision) {
                    return {
                        source: 'local-cloud-conflict',
                        workspace: parsedWorkspace,
                        remoteWorkspace: dirtyCloudData,
                        pendingCloudSync: true,
                        conflict: {
                            localRevision: localRevision,
                            remoteRevision: remoteRevision,
                            localSavedAt: dirtyMarker.savedAt || parsedWorkspace.savedAt || null,
                            remoteSavedAt: dirtyCloudData.updatedAt || dirtyCloudData.savedAt || null
                        }
                    };
                }
            }
            return {
                source: 'local-workspace',
                workspace: parsedWorkspace,
                remoteWorkspace: dirtyCloudData,
                pendingCloudSync: true,
                error: localReadError
            };
        }

        if (options.shouldLoadCloud && typeof options.loadFromCloud === 'function') {
            try {
                var cloudData = await options.loadFromCloud(options.loadKey);
                if (!isCurrent()) return { source: 'stale', stale: true };
                if (hasWorkspaceData(cloudData)) return { source: 'cloud', workspace: cloudData, error: localReadError };
            } catch (error) {
                if (!isCurrent()) return { source: 'stale', stale: true };
            }
        }

        if (!isCurrent()) return { source: 'stale', stale: true };
        if (parsedWorkspace) return { source: 'local-workspace', workspace: parsedWorkspace };
        if (!storage || typeof storage.getItem !== 'function') return { source: 'empty', error: localReadError };
        if (localReadError) return { source: 'empty', error: localReadError };
        try {
            var savedAbc = storage.getItem(options.abcKey) ||
                (options.legacyAbcKey && options.abcKey !== options.legacyAbcKey ? storage.getItem(options.legacyAbcKey) : null);
            var savedObservations = storage.getItem(options.observationKey) ||
                (options.legacyObservationKey && options.observationKey !== options.legacyObservationKey ? storage.getItem(options.legacyObservationKey) : null);
            if (!isCurrent()) return { source: 'stale', stale: true };
            return {
                source: savedAbc || savedObservations ? 'local-legacy' : 'empty',
                abcEntries: parseStoredArray(savedAbc),
                observationSessions: parseStoredArray(savedObservations)
            };
        } catch (error) {
            return { source: 'empty', error: error };
        }
    }
    window.AlloModules.BehaviorLensWorkspace = Object.freeze({
        createHydrationGuard: createHydrationGuard,
        emptyStudentProfile: emptyStudentProfile,
        normalizeWorkspace: normalizeWorkspace,
        normalizeRevision: normalizeRevision,
        workspaceRevision: workspaceRevision,
        parseDirtyMarker: parseDirtyMarker,
        sameWorkspaceEdit: sameWorkspaceEdit,
        sameWorkspaceSnapshot: sameWorkspaceSnapshot,
        findLatestTabDraft: findLatestTabDraft,
        WORKSPACE_VERSION: WORKSPACE_VERSION,
        MAX_TARGET_BEHAVIORS: MAX_TARGET_BEHAVIORS,
        MAX_DELETED_ABC_ENTRIES: MAX_DELETED_ABC_ENTRIES,
        MAX_AUDIT_EVENTS: MAX_AUDIT_EVENTS,
        MAX_WORKFLOW_DIAGNOSTICS: MAX_WORKFLOW_DIAGNOSTICS,
        MAX_TOOL_STATE_BYTES: MAX_TOOL_STATE_BYTES,
        MAX_WORKSPACE_IMPORT_BYTES: MAX_WORKSPACE_IMPORT_BYTES,
        MAX_SHARED_WORKSPACE_IMPORT_BYTES: MAX_SHARED_WORKSPACE_IMPORT_BYTES,
        LOCAL_WORKSPACE_SAVE_DELAY_MS: LOCAL_WORKSPACE_SAVE_DELAY_MS,
        COLLECTION_DEFAULT_PAGE_SIZE: COLLECTION_DEFAULT_PAGE_SIZE,
        COLLECTION_MAX_PAGE_SIZE: COLLECTION_MAX_PAGE_SIZE,
        paginateCollection: paginateCollection,
        boundedText: boundedText,
        normalizeToken: normalizeToken,
        stableHash: stableHash,
        canonicalBehaviorId: canonicalBehaviorId,
        normalizeIsoTimestamp: normalizeIsoTimestamp,
        normalizeTimezoneOffset: normalizeTimezoneOffset,
        localDayKey: localDayKey,
        parseLocalDateBoundary: parseLocalDateBoundary,
        normalizeTargetBehaviors: normalizeTargetBehaviors,
        resolveCanonicalBehavior: resolveCanonicalBehavior,
        normalizeIntensity: normalizeIntensity,
        normalizeAbcEntry: normalizeAbcEntry,
        normalizeAbcEntries: normalizeAbcEntries,
        normalizeObservationSession: normalizeObservationSession,
        normalizeObservationSessions: normalizeObservationSessions,
        normalizeToolState: normalizeToolState,
        summarizeIntensity: summarizeIntensity,
        groupByCanonicalBehavior: groupByCanonicalBehavior,
        groupByLocalDay: groupByLocalDay,
        filterByDateRange: filterByDateRange,
        summarizeExposure: summarizeExposure,
        calculateIncidentRate: calculateIncidentRate,
        summarizePhases: summarizePhases,
        inspectAbcData: inspectAbcData,
        dataFingerprint: dataFingerprint,
        selectStratifiedEntries: selectStratifiedEntries,
        createAnalysisProvenance: createAnalysisProvenance,
        isAnalysisStale: isAnalysisStale,
        createAuditEvent: createAuditEvent,
        appendBounded: appendBounded,
        softDeleteAbcEntries: softDeleteAbcEntries,
        restoreDeletedAbcEntry: restoreDeletedAbcEntry,
        utf8ByteLength: utf8ByteLength,
        formatByteSize: formatByteSize,
        createWorkspacePersistenceScheduler: createWorkspacePersistenceScheduler,
        createLocalWorkspaceWritePlan: createLocalWorkspaceWritePlan,
        assessLocalStorageWrite: assessLocalStorageWrite,
        validateWorkspaceImport: validateWorkspaceImport,
        validateSharedWorkspaceImport: validateSharedWorkspaceImport,
        persistLocalWorkspace: persistLocalWorkspace,
        acknowledgeCloudWorkspace: acknowledgeCloudWorkspace,
        commitCloudWorkspace: commitCloudWorkspace,
        hasWorkspaceData: hasWorkspaceData,
        loadStudentWorkspace: loadStudentWorkspace
    });
})();
