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
        var source = data && typeof data === 'object' ? data : {};
        var profile = source.studentProfile && typeof source.studentProfile === 'object'
            ? source.studentProfile : {};
        return {
            abcEntries: Array.isArray(source.abcEntries) ? source.abcEntries.slice(0, 5000) : [],
            observationSessions: Array.isArray(source.observationSessions) ? source.observationSessions.slice(0, 1000) : [],
            sessionNotes: Array.isArray(source.sessionNotes) ? source.sessionNotes.slice(0, 500) : [],
            teamNotes: Array.isArray(source.teamNotes) ? source.teamNotes.slice(0, 500) : [],
            studentProfile: Object.assign(emptyStudentProfile(), profile),
            sessionHistory: Array.isArray(source.sessionHistory) ? source.sessionHistory.slice(0, 1000) : [],
            designPhases: Array.isArray(source.designPhases) ? source.designPhases.slice(0, 100) : [],
            activityRegistry: source.activityRegistry && typeof source.activityRegistry === 'object' ? source.activityRegistry : {},
            activeDesign: source.activeDesign || null,
            workflowTrack: source.workflowTrack || null,
            workflowSubSteps: source.workflowSubSteps && typeof source.workflowSubSteps === 'object' ? source.workflowSubSteps : {},
            graphExport: source.graphExport || null,
            effectSizeResults: source.effectSizeResults || null,
            aiAnalysis: source.aiAnalysis || null,
            fullSummary: typeof source.fullSummary === 'string' ? source.fullSummary : '',
            dismissedAlerts: Array.isArray(source.dismissedAlerts) ? source.dismissedAlerts : [],
            visitedPanels: Array.isArray(source.visitedPanels) ? source.visitedPanels : [],
            favorites: Array.isArray(source.favorites) ? source.favorites.slice(0, 100) : null,
            userRole: typeof source.userRole === 'string' ? source.userRole : null,
            savedAt: source.savedAt || null,
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
        visitedPanels: 5000
    };

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
        MAX_WORKSPACE_IMPORT_BYTES: MAX_WORKSPACE_IMPORT_BYTES,
        MAX_SHARED_WORKSPACE_IMPORT_BYTES: MAX_SHARED_WORKSPACE_IMPORT_BYTES,
        LOCAL_WORKSPACE_SAVE_DELAY_MS: LOCAL_WORKSPACE_SAVE_DELAY_MS,
        COLLECTION_DEFAULT_PAGE_SIZE: COLLECTION_DEFAULT_PAGE_SIZE,
        COLLECTION_MAX_PAGE_SIZE: COLLECTION_MAX_PAGE_SIZE,
        paginateCollection: paginateCollection,
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
