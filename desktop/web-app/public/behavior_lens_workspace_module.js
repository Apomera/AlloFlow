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
            savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null
        };
    }

    function sameWorkspaceSnapshot(left, right) {
        if (!left || !right) return false;
        return (left.savedAt || null) === (right.savedAt || null) &&
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

    function persistLocalWorkspace(options) {
        options = options || {};
        var storage = options.storage;
        if (!storage || typeof storage.setItem !== 'function') {
            throw new Error('Browser workspace storage is unavailable');
        }
        var workspace = options.workspace && typeof options.workspace === 'object'
            ? options.workspace : {};
        var dirtyKey = options.dirtyKey;
        var suppressDirtyMark = !!options.suppressDirtyMark;

        // Establish the recovery marker before replacing the authoritative
        // workspace. If storage fails at any later write, reload recovery will
        // continue treating the last readable workspace as unsynchronized.
        if (!suppressDirtyMark && dirtyKey) {
            storage.setItem(dirtyKey, JSON.stringify({
                pending: true,
                revision: workspaceRevision(workspace),
                savedAt: workspace.savedAt || null
            }));
        }
        storage.setItem(options.workspaceKey, JSON.stringify(workspace));
        if (options.abcKey) storage.setItem(options.abcKey, JSON.stringify(options.abcEntries || []));
        if (options.observationKey) storage.setItem(options.observationKey, JSON.stringify(options.observationSessions || []));

        // A cloud-selected snapshot becomes clean only after every local copy
        // was written successfully. A partial write therefore keeps the marker.
        if (suppressDirtyMark && dirtyKey && typeof storage.removeItem === 'function') {
            storage.removeItem(dirtyKey);
        }
        return workspace;
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
        sameWorkspaceSnapshot: sameWorkspaceSnapshot,
        findLatestTabDraft: findLatestTabDraft,
        persistLocalWorkspace: persistLocalWorkspace,
        commitCloudWorkspace: commitCloudWorkspace,
        hasWorkspaceData: hasWorkspaceData,
        loadStudentWorkspace: loadStudentWorkspace
    });
})();
