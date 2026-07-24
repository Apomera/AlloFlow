/* ============================================================
   PasstheEPPP — App Router & Core Utilities
   ============================================================ */

const App = (() => {
    const STORAGE_KEY = 'eppp_prep_pro';
    let currentPage = 'dashboard';

    // ---- Persistence ----
    function getStore() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || createDefaultStore();
        } catch { return createDefaultStore(); }
    }

    function saveStore(store) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    function createDefaultStore() {
        return {
            quizHistory: [],       // { date, domainId, score, total, questions }
            examHistory: [],       // { date, score, total, scaled, passed, domainScores, answers }
            diagnosticHistory: [], // { date, overallPct, domainScores, correct, total }
            studyProgress: {},     // { [domainId]: { [topicIdx]: true } }
            flashcardProgress: {}, // { [domainId]: { [cardIdx]: 'easy'|'medium'|'hard' } }
            spacedRepetition: {},  // { [cardKey]: { ef, interval, repetitions, nextReview, lastReview } }
            bookmarks: [],         // { type, domainId, itemId, date, note? }
            notes: {},             // { [key]: string }
            highlights: [],        // { domainId, topicIdx, text, color, date }
            streakDays: [],        // ISO date strings
            totalTimeStudied: 0,   // seconds
            studyTimeSessions: [], // { date, duration, page }
            masteredQuestions: [], // list of question IDs that have been answered correctly
            settings: {
                darkMode: true,
                showTimer: true,
                questionCount: 20
            }
        };
    }

    // ---- Navigation ----
    function navigateTo(page, params = {}) {
        currentPage = page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navBtn = document.querySelector(`.sidebar [data-page="${page}"]`);
        if (navBtn) navBtn.classList.add('active');

        // Sync bottom nav active state
        document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
        const bnavBtn = document.querySelector(`.mobile-bottom-nav [data-page="${page}"]`);
        if (bnavBtn) bnavBtn.classList.add('active');

        const main = document.getElementById('main-content');
        main.innerHTML = '';
        main.className = 'main-content page-enter';

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('open');
        switch (page) {
            case 'dashboard': Dashboard.render(main); break;
            case 'diagnostic': Diagnostic.render(main, params); break;
            case 'study': Study.render(main, params); break;
            case 'flashcards': Flashcards.render(main, params); break;
            case 'quiz': Quiz.render(main, params); break;
            case 'exam': Exam.render(main, params); break;
            case 'cat': CATPage.render(main); break;
            case 'analytics': Analytics.render(main); break;
            case 'goals': StudyGoals.render(main); break;
            case 'memory_aids': MemoryAids.render(main); break;
            case 'bookmarks': Bookmarks.render(main); break;
            case 'search': Search.render(main); break;
            case 'about': if (typeof CommunityFeedback !== 'undefined') CommunityFeedback.renderAboutPage(main); break;
            case 'reflections': if (typeof Reflections !== 'undefined') Reflections.render(main); break;
            case 'textbook': main.innerHTML = '<div id="textbook-content"></div>'; if (typeof renderTextbook !== 'undefined') renderTextbook('textbook-content'); break;
            case 'settings': renderSettings(main); break;
        }
    }

    // ---- Readiness Score ----
    function calculateReadiness() {
        const store = getStore();
        const domainWeights = {
            1: 0.10, 2: 0.13, 3: 0.11, 4: 0.12,
            5: 0.16, 6: 0.15, 7: 0.07, 8: 0.16
        };
        let weightedScore = 0;
        let hasData = false;

        for (let d = 1; d <= 8; d++) {
            const domainQuizzes = store.quizHistory.filter(q => q.domainId === d);
            const domainExams = store.examHistory.flatMap(e =>
                e.domainScores ? [{ score: e.domainScores[d]?.correct || 0, total: e.domainScores[d]?.total || 1 }] : []
            );
            const all = [...domainQuizzes, ...domainExams];
            if (all.length > 0) {
                hasData = true;
                // Use last 5 attempts, more recent weighted higher
                const recent = all.slice(-5);
                let wSum = 0, wCount = 0;
                recent.forEach((q, i) => {
                    const w = i + 1;
                    wSum += (q.score / q.total) * w;
                    wCount += w;
                });
                weightedScore += (wSum / wCount) * domainWeights[d];
            }
        }

        return hasData ? Math.round(weightedScore * 100) : 0;
    }

    function getDomainScore(domainId) {
        const store = getStore();
        const quizzes = store.quizHistory.filter(q => q.domainId === domainId);
        if (quizzes.length === 0) return null;
        const recent = quizzes.slice(-5);
        let wSum = 0, wCount = 0;
        recent.forEach((q, i) => {
            const w = i + 1;
            wSum += (q.score / q.total) * w;
            wCount += w;
        });
        return Math.round((wSum / wCount) * 100);
    }

    // ---- Mastery Tracking ----
    function getQuestionId(q) {
        if (!q || (!q.q && typeof q !== 'string')) return null;
        const text = typeof q === 'string' ? q : q.q;
        return text.substring(0, 60) + '|' + (q.domainId || 0);
    }

    function markQuestionMastered(q) {
        const id = getQuestionId(q);
        if (!id) return;
        const store = getStore();
        if (!store.masteredQuestions) store.masteredQuestions = [];
        if (!store.masteredQuestions.includes(id)) {
            store.masteredQuestions.push(id);
            saveStore(store);
        }
    }

    function isQuestionMastered(q) {
        const store = getStore();
        if (!store.masteredQuestions) return false;
        return store.masteredQuestions.includes(getQuestionId(q));
    }

    function getMasteredQuestionsSet() {
        const store = getStore();
        return new Set(store.masteredQuestions || []);
    }

    // ---- Streak ----
    function updateStreak() {
        const store = getStore();
        const today = new Date().toISOString().split('T')[0];
        if (!store.streakDays.includes(today)) {
            store.streakDays.push(today);
            saveStore(store);
        }
    }

    function getCurrentStreak() {
        const store = getStore();
        const days = [...store.streakDays].sort().reverse();
        if (days.length === 0) return 0;
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < days.length; i++) {
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            const expectedStr = expected.toISOString().split('T')[0];
            if (days[i] === expectedStr) streak++;
            else break;
        }
        return streak;
    }

    // ---- Toast ----
    function toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('toast-exit');
            setTimeout(() => el.remove(), 250);
        }, 3000);
    }

    // ---- Score Ring SVG Helper ----
    function createScoreRing(score, size = 160, strokeWidth = 10) {
        const r = (size - strokeWidth) / 2;
        const circ = 2 * Math.PI * r;
        const offset = circ - (score / 100) * circ;
        let color;
        if (score >= 70) color = 'var(--color-success)';
        else if (score >= 40) color = 'var(--color-warning)';
        else color = 'var(--color-danger)';

        return `
            <div class="score-ring" style="width:${size}px;height:${size}px;">
                <svg width="${size}" height="${size}">
                    <circle class="score-ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
                    <circle class="score-ring-fill" cx="${size/2}" cy="${size/2}" r="${r}"
                        stroke="${color}"
                        stroke-dasharray="${circ}"
                        stroke-dashoffset="${offset}"
                    />
                </svg>
                <div class="score-ring-label">
                    <div class="score-ring-value" style="color:${color}">${score}%</div>
                    <div class="score-ring-text">Readiness</div>
                </div>
            </div>
        `;
    }

    // ---- Progress Bar Helper ----
    function progressBar(pct) {
        let cls = '';
        if (pct >= 70) cls = 'success';
        else if (pct >= 40) cls = 'warning';
        else cls = 'danger';
        return `<div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>`;
    }

    // ---- Settings Page ----
    function renderSettings(container) {
        const store = getStore();
        container.innerHTML = `
            <div class="page-header">
                <h1>Settings</h1>
                <p>Configure your study preferences</p>
            </div>
            <div class="card settings-section">
                <h3>Preferences</h3>
                <div class="settings-option">
                    <div>
                        <div class="settings-label">Default Quiz Length</div>
                        <div class="settings-desc">Number of questions per quiz session</div>
                    </div>
                    <select id="settings-qcount" style="width:80px;">
                        ${[10,15,20,25,30,40,50].map(n => `<option value="${n}" ${store.settings.questionCount===n?'selected':''}>${n}</option>`).join('')}
                    </select>
                </div>
                <div class="settings-option">
                    <div>
                        <div class="settings-label">Show Exam Timer</div>
                        <div class="settings-desc">Display countdown during practice exams</div>
                    </div>
                    <label class="toggle">
                        <input type="checkbox" id="settings-timer" ${store.settings.showTimer?'checked':''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            <div class="card settings-section mt-15">
                <h3>Data Management</h3>
                <div class="settings-option">
                    <div>
                        <div class="settings-label">Export Progress</div>
                        <div class="settings-desc">Download your study data as a backup file</div>
                    </div>
                    <button class="btn btn-secondary btn-sm" id="settings-export">📤 Export</button>
                </div>
                <div class="settings-option">
                    <div>
                        <div class="settings-label">Import Progress</div>
                        <div class="settings-desc">Restore from a previously exported backup file</div>
                    </div>
                    <button class="btn btn-secondary btn-sm" id="settings-import">📥 Import</button>
                    <input type="file" id="settings-import-file" accept=".json" style="display:none;">
                </div>
                <div class="settings-option">
                    <div>
                        <div class="settings-label">Reset All Progress</div>
                        <div class="settings-desc">Clear all quiz history, bookmarks, and notes</div>
                    </div>
                    <button class="btn btn-danger btn-sm" id="settings-reset">⚠️ Reset</button>
                </div>
            </div>
            <div class="card settings-section mt-15">
                <h3>App Info</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                    <div class="text-sm text-muted">Total Questions</div>
                    <div class="text-sm">${EPPPData.domains.reduce((s,d)=>s+d.questions.length,0)}</div>
                    <div class="text-sm text-muted">Total Flashcards</div>
                    <div class="text-sm">${EPPPData.domains.reduce((s,d)=>s+(d.flashcards?.length||0),0)}</div>
                    <div class="text-sm text-muted">Memory Aids</div>
                    <div class="text-sm">${typeof MemoryAids!=='undefined'?MemoryAids.aids.length:0}</div>
                    <div class="text-sm text-muted">Quizzes Taken</div>
                    <div class="text-sm">${store.quizHistory.length}</div>
                    <div class="text-sm text-muted">Questions Answered</div>
                    <div class="text-sm">${store.quizHistory.reduce((s,q)=>s+q.total,0)}</div>
                </div>
            </div>
        `;

        document.getElementById('settings-qcount').addEventListener('change', e => {
            store.settings.questionCount = parseInt(e.target.value);
            saveStore(store);
            toast('Quiz length updated', 'success');
        });

        document.getElementById('settings-timer').addEventListener('change', e => {
            store.settings.showTimer = e.target.checked;
            saveStore(store);
            toast('Timer preference saved', 'success');
        });

        document.getElementById('settings-export').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            const date = new Date().toISOString().split('T')[0];
            a.download = `eppp_prep_pro_backup_${date}.json`;
            a.click();
            toast('Progress exported successfully!', 'success');
        });

        document.getElementById('settings-import').addEventListener('click', () => {
            document.getElementById('settings-import-file').click();
        });

        document.getElementById('settings-import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    // Validate it looks like our data
                    if (!data.quizHistory || !data.settings) {
                        throw new Error('Invalid backup file format');
                    }
                    if (confirm(`Import this backup? This will replace your current progress.\\n\\nBackup contains:\\n• ${data.quizHistory.length} quiz records\\n• ${(data.bookmarks||[]).length} bookmarks\\n• ${Object.keys(data.spacedRepetition||{}).length} flashcard progress entries\\n\\nYour current progress will be overwritten.`)) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                        toast('Progress imported successfully! Reloading...', 'success');
                        setTimeout(() => location.reload(), 1000);
                    }
                } catch (err) {
                    toast('Invalid backup file. Please select a valid PasstheEPPP export.', 'error');
                }
            };
            reader.readAsText(file);
        });

        document.getElementById('settings-reset').addEventListener('click', () => {
            if (confirm('Are you sure? This will permanently delete all your study progress, quiz history, bookmarks, and notes.')) {
                localStorage.removeItem(STORAGE_KEY);
                toast('All progress has been reset', 'warning');
                navigateTo('dashboard');
            }
        });
    }

    // ---- Init ----
    function init() {
        // Sidebar nav
        document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(btn.dataset.page));
        });

        // Mobile menu
        document.getElementById('mobile-menu-btn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebar-overlay').classList.toggle('open');
        });

        document.getElementById('sidebar-overlay').addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-overlay').classList.remove('open');
        });

        // Mobile bottom nav
        document.querySelectorAll('.bottom-nav-item[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.page === 'menu') {
                    // "More" button opens the sidebar menu
                    document.getElementById('sidebar').classList.add('open');
                    document.getElementById('sidebar-overlay').classList.add('open');
                } else {
                    navigateTo(btn.dataset.page);
                }
            });
        });

        // Initialize default store if needed
        if (!localStorage.getItem(STORAGE_KEY)) {
            saveStore(createDefaultStore());
        }

        // Start study time tracking
        startTimeTracking();

        navigateTo('dashboard');
    }

    // ---- Study Time Tracking ----
    let _trackingStart = Date.now();
    let _trackingInterval = null;

    function startTimeTracking() {
        _trackingStart = Date.now();
        // Save every 30 seconds while active
        _trackingInterval = setInterval(() => {
            const elapsed = Math.round((Date.now() - _trackingStart) / 1000);
            if (elapsed > 0) {
                const store = getStore();
                store.totalTimeStudied = (store.totalTimeStudied || 0) + 30;
                saveStore(store);
            }
        }, 30000);

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Save accumulated time when page is hidden
                const elapsed = Math.round((Date.now() - _trackingStart) / 1000);
                if (elapsed > 5) {
                    const store = getStore();
                    store.totalTimeStudied = (store.totalTimeStudied || 0) + elapsed;
                    if (!store.studyTimeSessions) store.studyTimeSessions = [];
                    store.studyTimeSessions.push({date: new Date().toISOString(), duration: elapsed, page: currentPage});
                    saveStore(store);
                }
                clearInterval(_trackingInterval);
            } else {
                _trackingStart = Date.now();
                startTimeTracking();
            }
        });
    }

    function getStudyTimeFormatted() {
        const store = getStore();
        const total = store.totalTimeStudied || 0;
        const hours = Math.floor(total / 3600);
        const mins = Math.floor((total % 3600) / 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        navigateTo,
        getStore,
        saveStore,
        calculateReadiness,
        getDomainScore,
        updateStreak,
        getCurrentStreak,
        toast,
        createScoreRing,
        progressBar,
        getStudyTimeFormatted,
        getQuestionId,
        markQuestionMastered,
        isQuestionMastered,
        getMasteredQuestionsSet,
        getCurrentPage: () => currentPage
    };
})();
