/* Dashboard Module */
const Dashboard = {
    render(container) {
        const store = App.getStore();
        const readiness = App.calculateReadiness();
        const streak = App.getCurrentStreak();
        const totalQuestions = store.quizHistory.reduce((s,q)=>s+q.total,0) + store.examHistory.reduce((s,e)=>s+e.total,0);
        const totalQuizzes = store.quizHistory.length;

        // Spaced rep due cards
        const srData = store.spacedRepetition || {};
        const allFlashcards = EPPPData.domains.flatMap(d => d.flashcards.map((c,i) => ({domainId: d.id, idx: i})));
        const dueCards = allFlashcards.filter(c => {
            const sr = srData[`${c.domainId}_${c.idx}`];
            if (!sr) return true;
            return new Date(sr.nextReview) <= new Date();
        }).length;

        const hasDiagnostic = store.diagnosticHistory && store.diagnosticHistory.length > 0;

        container.innerHTML = `
        <div class="page-header">
            <h1>Welcome back! 👋</h1>
            <p>Your EPPP study dashboard — track progress across all 8 domains</p>
        </div>

        ${!hasDiagnostic ? `
        <div class="card mb-15" style="border:2px solid var(--accent-primary);background:var(--accent-primary-dim);">
            <div class="flex justify-between items-center">
                <div>
                    <h3 style="margin:0;">📊 Take the Diagnostic Exam</h3>
                    <p class="text-sm text-muted mt-025">40 questions to identify your strengths and create a personalized study plan</p>
                </div>
                <button class="btn btn-primary" onclick="App.navigateTo('diagnostic')">Start Diagnostic →</button>
            </div>
        </div>` : ''}

        <div class="grid-2 mb-15">
            <div class="card" style="display:flex;align-items:center;gap:2rem;justify-content:center;padding:2rem;">
                ${App.createScoreRing(readiness, 160, 10)}
                <div>
                    <h3 style="margin-bottom:0.5rem;">Readiness Score</h3>
                    <p class="text-muted text-sm">Based on your quiz and exam performance weighted by EPPP domain percentages</p>
                    ${readiness === 0 ? '<p class="text-sm mt-05" style="color:var(--color-info)">Take a quiz to start tracking!</p>' : ''}
                </div>
            </div>
            <div class="stats-grid" style="grid-template-columns:1fr 1fr;">
                <div class="card stat-card">
                    <div class="stat-icon" style="background:var(--color-success-dim);color:var(--color-success);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <div class="stat-value">${streak}</div>
                    <div class="stat-label">Day Streak</div>
                </div>
                <div class="card stat-card">
                    <div class="stat-icon" style="background:var(--accent-secondary-dim);color:var(--accent-secondary);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div class="stat-value">${App.getStudyTimeFormatted()}</div>
                    <div class="stat-label">Study Time</div>
                </div>
                <div class="card stat-card">
                    <div class="stat-icon" style="background:var(--color-warning-dim);color:var(--color-warning);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 115.12 2.13c-.58.49-1.12 1.02-1.12 1.87"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>
                    </div>
                    <div class="stat-value">${totalQuestions}</div>
                    <div class="stat-label">Questions Answered</div>
                </div>
                <div class="card stat-card" ${dueCards > 0 ? 'style="border-color:var(--color-danger);cursor:pointer;" onclick="App.navigateTo(\'flashcards\')"' : ''}>
                    <div class="stat-icon" style="background:${dueCards > 0 ? 'var(--color-danger-dim)' : 'var(--accent-primary-dim)'};color:${dueCards > 0 ? 'var(--color-danger)' : 'var(--accent-primary)'};">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="16" height="14" rx="2"/><rect x="6" y="6" width="16" height="14" rx="2"/></svg>
                    </div>
                    <div class="stat-value" style="${dueCards > 0 ? 'color:var(--color-danger);' : ''}">${dueCards}</div>
                    <div class="stat-label">${dueCards > 0 ? 'Cards Due Now' : 'Cards Due'}</div>
                </div>
            </div>
        </div>

        <h2 style="margin-bottom:1rem;">Domain Proficiency</h2>
        <div class="card mb-15">
            <div class="domain-list">
                ${EPPPData.domains.map(d => {
                    const score = App.getDomainScore(d.id);
                    const pct = score !== null ? score : 0;
                    return `<div class="domain-item">
                        <div class="domain-number" style="background:${d.color}22;color:${d.color}">${d.id}</div>
                        <div class="domain-info">
                            <div class="domain-name">
                                <span>${d.name}</span>
                                <span>${score !== null ? pct + '%' : 'Not started'} · ${d.weight}% of exam</span>
                            </div>
                            ${App.progressBar(pct)}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <h2 style="margin-bottom:1rem;">Quick Start</h2>
        <div class="quick-actions">
            <button class="quick-action-btn" onclick="App.navigateTo('diagnostic')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Diagnostic
            </button>
            <button class="quick-action-btn" onclick="App.navigateTo('study')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                Study Content
            </button>
            <button class="quick-action-btn" onclick="App.navigateTo('flashcards')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="16" height="14" rx="2"/><rect x="6" y="6" width="16" height="14" rx="2"/></svg>
                Flashcards ${dueCards > 0 ? `<span class="badge badge-danger" style="margin-left:4px;">${dueCards} due</span>` : ''}
            </button>
            <button class="quick-action-btn" onclick="App.navigateTo('quiz')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 115.12 2.13c-.58.49-1.12 1.02-1.12 1.87"/></svg>
                Quick Quiz
            </button>
            <button class="quick-action-btn" onclick="App.navigateTo('exam')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Practice Exam
            </button>
        </div>
        `;
    }
};
